from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    for path, name in [('/', 'hub'), ('/order-of-play', 'oop')]:
        page.goto(f'https://baseline-rho-five.vercel.app{path}')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1500)
        overflow = page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        print(f'{name}: overflow = {overflow}px')
        page.screenshot(path=f'shot-final-{name}.png')
    browser.close()
print('done')
