$server = "root@168.119.242.183"
$src = "C:\DEV\Hartmaatje\NL-EN-FR-DE-ES-videos"
$dest = "/opt/hartmaatje/public"

Write-Host "Stap 1: Mappen aanmaken op server..." -ForegroundColor Green
ssh $server "mkdir -p /opt/hartmaatje/public/avatars/fenna /opt/hartmaatje/public/avatars/maarten /opt/hartmaatje/public/avatars/peter /opt/hartmaatje/public/avatars/colette /opt/hartmaatje/public/videos"

Write-Host "Stap 2: Fenna welkomstvideo's uploaden..." -ForegroundColor Green
scp "$src\NL-Hartmaatje -fenna.mp4"            "${server}:${dest}/avatars/fenna/welcome.nl.mp4"
scp "$src\EN - Hartmaatje (1fenna.mp4"          "${server}:${dest}/avatars/fenna/welcome.en.mp4"
scp "$src\DE - Hartmaatje (1)-fenna.mp4"        "${server}:${dest}/avatars/fenna/welcome.de.mp4"
scp "$src\FR - Hartmaatje (1)-fenna.mp4"        "${server}:${dest}/avatars/fenna/welcome.fr.mp4"
scp "$src\ES - Hartmaatje (1)-fenna.mp4"        "${server}:${dest}/avatars/fenna/welcome.es.mp4"

Write-Host "Stap 3: Maarten welkomstvideo's uploaden..." -ForegroundColor Green
scp "$src\NL-Hartmaatje (1)-maarten.mp4"        "${server}:${dest}/avatars/maarten/welcome.nl.mp4"
scp "$src\EN - Hartmaatje (1)-maarten.mp4"      "${server}:${dest}/avatars/maarten/welcome.en.mp4"
scp "$src\DE - Hartmaatje (1)-maarten.mp4"      "${server}:${dest}/avatars/maarten/welcome.de.mp4"
scp "$src\FR - Hartmaatje (1)-maarten.mp4"      "${server}:${dest}/avatars/maarten/welcome.fr.mp4"
scp "$src\ES - Hartmaatje (1)-maarten.mp4"      "${server}:${dest}/avatars/maarten/welcome.es.mp4"

Write-Host "Stap 4: Peter welkomstvideo's uploaden..." -ForegroundColor Green
scp "$src\Hartmaatje (1)-peter.mp4"             "${server}:${dest}/avatars/peter/welcome.nl.mp4"
scp "$src\EN - Hartmaatje (1)-peter.mp4"        "${server}:${dest}/avatars/peter/welcome.en.mp4"
scp "$src\DE - Hartmaatje (1)-peter.mp4"        "${server}:${dest}/avatars/peter/welcome.de.mp4"
scp "$src\FR - Hartmaatje (1)-peter.mp4"        "${server}:${dest}/avatars/peter/welcome.fr.mp4"
scp "$src\ES - Hartmaatje (1)-peter.mp4"        "${server}:${dest}/avatars/peter/welcome.es.mp4"

Write-Host "Stap 5: Colette welkomstvideo's uploaden..." -ForegroundColor Green
scp "$src\NL-Hartmaatje-colette.mp4"            "${server}:${dest}/avatars/colette/welcome.nl.mp4"
scp "$src\EN - Hartmaatje-colette.mp4"          "${server}:${dest}/avatars/colette/welcome.en.mp4"
scp "$src\DE - Hartmaatje-colette.mp4"          "${server}:${dest}/avatars/colette/welcome.de.mp4"
scp "$src\FR - Hartmaatje-colette.mp4"          "${server}:${dest}/avatars/colette/welcome.fr.mp4"
scp "$src\ES - Hartmaatje-colette.mp4"          "${server}:${dest}/avatars/colette/welcome.es.mp4"

Write-Host "Stap 6: Verhaalvideo's uploaden (groot, dit duurt even)..." -ForegroundColor Green
scp "$src\NL- Hartmaatje met Einde (127mb)-verhaal.mp4"   "${server}:${dest}/videos/hartmaatje-verhaal.nl.mp4"
scp "$src\Hartmaatje met-story-(127mb).mp4"               "${server}:${dest}/videos/hartmaatje-verhaal.nl.mp4"
scp "$src\EN - Hartmaatje-story- (127mb).mp4"             "${server}:${dest}/videos/hartmaatje-verhaal.en.mp4"
scp "$src\DE - Hartmaatje met-story-(127mb).mp4"          "${server}:${dest}/videos/hartmaatje-verhaal.de.mp4"
scp "$src\FR - Hartmaatje met-story-(127mb).mp4"          "${server}:${dest}/videos/hartmaatje-verhaal.fr.mp4"
scp "$src\ES - Hartmaatje met-story-(127mb).mp4"          "${server}:${dest}/videos/hartmaatje-verhaal.es.mp4"

Write-Host "Stap 7: Alleen-en-eenzaam video uploaden..." -ForegroundColor Green
scp "$src\alleen-en-eenzaam.mp4"  "${server}:${dest}/videos/alleen-en-eenzaam.nl.mp4"
scp "$src\alleen-en-eenzaam.mp4"  "${server}:${dest}/videos/alleen-en-eenzaam.en.mp4"
scp "$src\alleen-en-eenzaam.mp4"  "${server}:${dest}/videos/alleen-en-eenzaam.de.mp4"
scp "$src\alleen-en-eenzaam.mp4"  "${server}:${dest}/videos/alleen-en-eenzaam.fr.mp4"
scp "$src\alleen-en-eenzaam.mp4"  "${server}:${dest}/videos/alleen-en-eenzaam.es.mp4"

Write-Host "Stap 8: Maarten verhaalvideo's (Sweet Dreams) uploaden..." -ForegroundColor Green
$maarten = "C:\DEV\Hartmaatje\HartMaatje-Maarten-dubs"
ssh $server "mkdir -p /opt/hartmaatje/public/videos/stories"
scp "$maarten\NL-maarten-Dubbed.mp4"        "${server}:${dest}/videos/stories/sweet-dreams-do-come-true.nl.mp4"
scp "$maarten\Maarten-SweetDreams-EN.mp4"   "${server}:${dest}/videos/stories/sweet-dreams-do-come-true.en.mp4"
scp "$maarten\Maarten-SweetDreams-DE.mp4"   "${server}:${dest}/videos/stories/sweet-dreams-do-come-true.de.mp4"
scp "$maarten\Maarten-SweetDreams-FR.mp4"   "${server}:${dest}/videos/stories/sweet-dreams-do-come-true.fr.mp4"
scp "$maarten\Maarten-SweetDreams-ES.mp4"   "${server}:${dest}/videos/stories/sweet-dreams-do-come-true.es.mp4"

Write-Host "" 
Write-Host "Klaar! Alle video's zijn geupload naar uw server." -ForegroundColor Green
Write-Host "Ga naar hartmaatje.app en vernieuw de pagina." -ForegroundColor Green
