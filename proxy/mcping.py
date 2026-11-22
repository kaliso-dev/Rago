#!/usr/bin/env python3
"""Ping Minecraft (protocole status ping/pong) : python3 mcping.py mc.hypixel.net [port] [essais]"""
import socket,struct,time,sys,statistics
def vi(n):
    o=b''
    while True:
        b=n&0x7f;n>>=7
        o+=bytes([b|(0x80 if n else 0)])
        if not n:return o
def rvi(s):
    n=0
    for i in range(5):
        b=s.recv(1)[0];n|=(b&0x7f)<<(7*i)
        if not b&0x80:return n
def recvn(s,n):
    d=b''
    while len(d)<n:
        c=s.recv(n-len(d))
        if not c:raise IOError('fermé')
        d+=c
    return d
def ping(host,port=25565):
    t0=time.perf_counter();s=socket.create_connection((host,port),5);tcp=(time.perf_counter()-t0)*1000
    h=host.encode();p=vi(0)+vi(47)+vi(len(h))+h+struct.pack('>H',port)+vi(1)
    s.sendall(vi(len(p))+p+b'\x01\x00')
    l=rvi(s);recvn(s,l)
    p=b'\x01'+struct.pack('>q',1);t0=time.perf_counter();s.sendall(vi(len(p))+p)
    l=rvi(s);recvn(s,l);mc=(time.perf_counter()-t0)*1000;s.close();return tcp,mc
host=sys.argv[1];port=int(sys.argv[2]) if len(sys.argv)>2 else 25565;n=int(sys.argv[3]) if len(sys.argv)>3 else 8
r=[]
for i in range(n):
    try:r.append(ping(host,port))
    except Exception as e:print('erreur',e)
    time.sleep(0.5)
if r:
    print(f"{host}: ping MC médian {statistics.median(x[1] for x in r):.1f} ms (meilleur {min(x[1] for x in r):.1f}) ; TCP vers l'entrée {statistics.median(x[0] for x in r):.1f} ms")
