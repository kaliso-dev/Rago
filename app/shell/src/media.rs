//! Musique et vidéos en cours (Spotify, navigateur, lecteur de Windows…) par les contrôles de lecture de Windows
//! (GlobalSystemMediaTransportControls) : titre, artiste, pochette, lecture/pause/suivant. Rien n'est lu dans les
//! applis elles-mêmes ; Windows prévient à chaque changement, Rago Shell ne demande jamais rien en boucle.

use std::sync::{Arc, Mutex, Weak};

use windows::core::Interface;
use windows::Foundation::TypedEventHandler;
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession as Session, GlobalSystemMediaTransportControlsSessionManager as Manager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status,
};
use windows::Storage::Streams::DataReader;

use crate::host::{Poster, WM_MEDIA};

#[derive(Debug, Clone, Default, PartialEq)]
pub struct Snapshot {
    pub present: bool,
    pub title: String,
    pub artist: String,
    pub playing: bool,
    /// pochette (image encodée : JPEG, PNG…)
    pub art: Option<Arc<Vec<u8>>>,
    /// identité du morceau (titre et artiste)
    pub key: u64,
    /// nouveau morceau, ou lecture/pause, depuis l'instantané précédent
    pub changed: bool,
}

struct Inner {
    manager: Manager,
    poster: Poster,
    snap: Mutex<Snapshot>,
    session: Mutex<Option<(Session, i64, i64)>>,
}

pub struct Media {
    inner: Arc<Inner>,
    token: i64,
}

fn key(title: &str, artist: &str) -> u64 {
    use std::hash::{Hash, Hasher};
    let mut h = std::collections::hash_map::DefaultHasher::new();
    (title, artist).hash(&mut h);
    h.finish()
}

fn thumbnail(props: &windows::Media::Control::GlobalSystemMediaTransportControlsSessionMediaProperties) -> Option<Vec<u8>> {
    let stream = props.Thumbnail().ok()?.OpenReadAsync().ok()?.join().ok()?;
    let size = stream.Size().ok()? as u32;
    if size == 0 || size > 8 * 1024 * 1024 {
        return None;
    }
    let reader = DataReader::CreateDataReader(&stream.GetInputStreamAt(0).ok()?).ok()?;
    let load: windows_future::IAsyncOperation<u32> = reader.LoadAsync(size).ok()?.cast().ok()?;
    load.join().ok()?;
    let mut buf = vec![0u8; size as usize];
    reader.ReadBytes(&mut buf).ok()?;
    Some(buf)
}

impl Inner {
    /// Branche les événements de la session en cours (celle que Windows montre dans ses contrôles de lecture).
    fn attach(self: &Arc<Self>) {
        let mut guard = self.session.lock().unwrap();
        if let Some((old, a, b)) = guard.take() {
            let _ = old.RemoveMediaPropertiesChanged(a);
            let _ = old.RemovePlaybackInfoChanged(b);
        }
        if let Ok(session) = self.manager.GetCurrentSession() {
            let weak: Weak<Inner> = Arc::downgrade(self);
            let w2 = weak.clone();
            let a = session.MediaPropertiesChanged(&TypedEventHandler::new(move |_, _| {
                if let Some(i) = weak.upgrade() {
                    i.refresh();
                }
                Ok(())
            }));
            let b = session.PlaybackInfoChanged(&TypedEventHandler::new(move |_, _| {
                if let Some(i) = w2.upgrade() {
                    i.refresh();
                }
                Ok(())
            }));
            if let (Ok(a), Ok(b)) = (a, b) {
                *guard = Some((session, a, b));
            }
        }
        drop(guard);
        self.refresh();
    }

    fn refresh(&self) {
        let session = self.session.lock().unwrap().as_ref().map(|(s, _, _)| s.clone());
        let mut next = Snapshot::default();
        if let Some(s) = session {
            if let Ok(props) = s.TryGetMediaPropertiesAsync().and_then(|op| op.join()) {
                next.title = props.Title().map(|t| t.to_string_lossy()).unwrap_or_default();
                next.artist = props.Artist().map(|t| t.to_string_lossy()).unwrap_or_default();
                next.present = !next.title.is_empty();
                next.key = key(&next.title, &next.artist);
                let prev_key = self.snap.lock().unwrap().key;
                next.art = if next.key == prev_key { self.snap.lock().unwrap().art.clone() } else { thumbnail(&props).map(Arc::new) };
            }
            next.playing = s.GetPlaybackInfo().and_then(|p| p.PlaybackStatus()).is_ok_and(|st| st == Status::Playing);
        }
        let mut snap = self.snap.lock().unwrap();
        next.changed = next.present && (next.key != snap.key || next.playing != snap.playing);
        if *snap != next {
            *snap = next;
            self.poster.post(WM_MEDIA, 0, 0);
        }
    }
}

impl Media {
    pub fn start(poster: Poster) -> Option<Media> {
        let manager = Manager::RequestAsync().ok()?.join().ok()?;
        let inner = Arc::new(Inner { manager: manager.clone(), poster, snap: Mutex::new(Snapshot::default()), session: Mutex::new(None) });
        let weak = Arc::downgrade(&inner);
        let token = manager
            .CurrentSessionChanged(&TypedEventHandler::new(move |_, _| {
                if let Some(i) = weak.upgrade() {
                    i.attach();
                }
                Ok(())
            }))
            .ok()?;
        inner.attach();
        // l'état de départ n'est pas un changement : pas d'île au lancement
        inner.snap.lock().unwrap().changed = false;
        Some(Media { inner, token })
    }

    /// État du moment sans le marquer comme lu (l'île garde ses « changé »).
    pub fn peek(&self) -> Snapshot {
        self.inner.snap.lock().unwrap().clone()
    }

    pub fn snapshot(&self) -> Snapshot {
        let mut s = self.inner.snap.lock().unwrap();
        let out = s.clone();
        s.changed = false;
        out
    }

    fn session(&self) -> Option<Session> {
        self.inner.session.lock().unwrap().as_ref().map(|(s, _, _)| s.clone())
    }

    pub fn toggle(&self) {
        if let Some(s) = self.session() {
            let _ = s.TryTogglePlayPauseAsync();
        }
    }

    pub fn next(&self) {
        if let Some(s) = self.session() {
            let _ = s.TrySkipNextAsync();
        }
    }

    pub fn previous(&self) {
        if let Some(s) = self.session() {
            let _ = s.TrySkipPreviousAsync();
        }
    }
}

impl Drop for Media {
    fn drop(&mut self) {
        let _ = self.inner.manager.RemoveCurrentSessionChanged(self.token);
        if let Some((s, a, b)) = self.inner.session.lock().unwrap().take() {
            let _ = s.RemoveMediaPropertiesChanged(a);
            let _ = s.RemovePlaybackInfoChanged(b);
        }
    }
}
