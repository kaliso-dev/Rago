SITE='https://rago-optimiser.netlify.app'  # public site URL: change when the domain is live
s=open('/mnt/project-files/site/src/page.html').read()
i=s.index('</style>')+len('</style>')
head='''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0A0A0B">
<meta property="og:title" content="Rago Optimizer">
<meta property="og:description" content="Every millisecond counts. The Minecraft PvP optimizer for Windows: 226 tweaks, undoable in one click.">
<meta property="og:type" content="website">
<meta property="og:url" content="{SITE}/">
<meta property="og:image" content="{SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{SITE}/og-image.png">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
'''
head=head.replace('{SITE}',SITE)
open('/mnt/project-files/site/index.html','w').write(head+s[:i]+'\n</head>\n<body>\n'+s[i:].lstrip('\n')+'\n</body>\n</html>\n')
