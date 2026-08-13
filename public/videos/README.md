# Videos — copy from the live HartMaatje server (too large for git)

The original website keeps media on the Hetzner server under `/opt/hartmaatje/public/`. Git only stores small portraits and welcome clips.

## Already in this repo

- `/avatars/{fenna,maarten,peter,colette}/welcome.mp4`
- `/avatars/{fenna,maarten,peter,colette}/portrait.png`

## Copy from the server into `public/`

**Talking / listening loops (optional — welcome.mp4 is used if these are missing):**

- `avatars/{fenna,maarten,peter,colette}/talk.mp4`
- `avatars/{fenna,maarten,peter,colette}/listening.mp4`
- `avatars/{id}/welcome.{nl,en,de,fr,es}.mp4`

**Story / about / privacy films:**

- `videos/hartmaatje-verhaal.mp4` (and `hartmaatje-verhaal.{lang}.mp4`)
- `videos/hartmaatje-intro.{lang}.mp4`
- `videos/hartmaatje-introduction.{lang}.mp4`
- `videos/alleen-en-eenzaam.{lang}.mp4`
- `videos/privacy-policy.{lang}.mp4`
- `videos/business-growth.{lang}.mp4`
- `videos/stories/{storyId}.{lang}.mp4`

On the server, from the project root:

```bash
rsync -av root@YOUR_SERVER:/opt/hartmaatje/public/avatars/ ./public/avatars/
rsync -av root@YOUR_SERVER:/opt/hartmaatje/public/videos/ ./public/videos/
```
