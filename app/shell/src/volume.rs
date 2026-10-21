//! Volume du son : Windows prévient Rago Shell à chaque changement (touches du clavier, mélangeur, casque…) et quand la
//! sortie par défaut change. Rien n'est lu en boucle, rien n'est modifié : l'île ne fait qu'afficher le niveau.

use windows::core::{implement, Result, PCWSTR};
use windows::Win32::Foundation::PROPERTYKEY;
use windows::Win32::Media::Audio::Endpoints::{IAudioEndpointVolume, IAudioEndpointVolumeCallback, IAudioEndpointVolumeCallback_Impl};
use windows::Win32::Media::Audio::{
    eConsole, eRender, EDataFlow, ERole, IMMDeviceEnumerator, IMMNotificationClient, IMMNotificationClient_Impl, MMDeviceEnumerator,
    AUDIO_VOLUME_NOTIFICATION_DATA, DEVICE_STATE,
};
use windows::Win32::System::Com::{CoCreateInstance, CLSCTX_ALL};

use crate::host::{Poster, WM_AUDIO_DEVICE, WM_VOLUME};

/// Appelé par Windows sur un de ses threads : on poste un message et on rend la main tout de suite.
#[implement(IAudioEndpointVolumeCallback)]
struct OnVolume(Poster);

impl IAudioEndpointVolumeCallback_Impl for OnVolume_Impl {
    fn OnNotify(&self, data: *mut AUDIO_VOLUME_NOTIFICATION_DATA) -> Result<()> {
        if let Some(d) = unsafe { data.as_ref() } {
            let level = (d.fMasterVolume.clamp(0.0, 1.0) * 1000.0).round() as usize;
            self.0.post(WM_VOLUME, level, d.bMuted.as_bool() as isize);
        }
        Ok(())
    }
}

#[implement(IMMNotificationClient)]
struct OnDevice(Poster);

impl IMMNotificationClient_Impl for OnDevice_Impl {
    fn OnDeviceStateChanged(&self, _id: &PCWSTR, _state: DEVICE_STATE) -> Result<()> {
        Ok(())
    }

    fn OnDeviceAdded(&self, _id: &PCWSTR) -> Result<()> {
        Ok(())
    }

    fn OnDeviceRemoved(&self, _id: &PCWSTR) -> Result<()> {
        Ok(())
    }

    fn OnDefaultDeviceChanged(&self, flow: EDataFlow, role: ERole, _id: &PCWSTR) -> Result<()> {
        if flow == eRender && role == eConsole {
            self.0.post(WM_AUDIO_DEVICE, 0, 0);
        }
        Ok(())
    }

    fn OnPropertyValueChanged(&self, _id: &PCWSTR, _key: &PROPERTYKEY) -> Result<()> {
        Ok(())
    }
}

pub struct Volume {
    enumerator: IMMDeviceEnumerator,
    endpoint: Option<IAudioEndpointVolume>,
    on_volume: IAudioEndpointVolumeCallback,
    on_device: IMMNotificationClient,
}

impl Volume {
    /// Écoute la sortie son par défaut. Sans sortie (aucun périphérique), on attend qu'il en arrive une.
    pub fn start(poster: Poster) -> Option<Volume> {
        unsafe {
            let enumerator: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).ok()?;
            let on_device: IMMNotificationClient = OnDevice(poster).into();
            enumerator.RegisterEndpointNotificationCallback(&on_device).ok()?;
            let on_volume: IAudioEndpointVolumeCallback = OnVolume(poster).into();
            let endpoint = enumerator
                .GetDefaultAudioEndpoint(eRender, eConsole)
                .ok()
                .and_then(|d| d.Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None).ok())
                .filter(|e| e.RegisterControlChangeNotify(&on_volume).is_ok());
            Some(Volume { enumerator, endpoint, on_volume, on_device })
        }
    }
}

impl Drop for Volume {
    fn drop(&mut self) {
        unsafe {
            if let Some(e) = &self.endpoint {
                let _ = e.UnregisterControlChangeNotify(&self.on_volume);
            }
            let _ = self.enumerator.UnregisterEndpointNotificationCallback(&self.on_device);
        }
    }
}
