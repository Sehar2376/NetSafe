#!/usr/bin/env python3
"""Run NetSafe locally with real HTTP security headers (standard library only).

    python serve.py                 # http://127.0.0.1:8000 and opens your browser
    python serve.py --port 9000 --no-browser

Only the app's own files are served (index.html, favicon.ico, css/, js/, assets/), and only on
this computer (127.0.0.1). Nothing else in the project folder is reachable.
"""
import argparse
import http.server
import pathlib
import posixpath
import re
import sys
import threading
import urllib.parse
import webbrowser

ROOT = pathlib.Path(__file__).resolve().parent
PUBLIC_FILES = ('index.html', 'favicon.ico')
PUBLIC_DIRS = ('css', 'js', 'assets')
# Fixed content types. Python's default guess reads the Windows registry, where ".js" is often mapped to
# "text/plain". With the "nosniff" header below, browsers then refuse to run every script and no button works.
MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.json': 'application/json',
    '.txt': 'text/plain; charset=utf-8',
}


def content_security_policy():
    """Reuse the policy written in index.html (one source of truth) and add the directive
    that only works as an HTTP header. 'file:' is only needed when opening from disk."""
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    match = re.search(r'Content-Security-Policy"\s+content="([^"]+)"', html)
    if not match:
        raise RuntimeError('index.html has no Content-Security-Policy meta tag')
    return match.group(1).replace(' file:', '') + "; frame-ancestors 'none'"


def security_headers():
    return {
        'Content-Security-Policy': content_security_policy(),
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'same-origin',
        'Cache-Control': 'no-cache',
    }


class Handler(http.server.SimpleHTTPRequestHandler):
    server_version = 'NetSafe'
    extensions_map = MIME_TYPES

    def guess_type(self, path):
        ext = posixpath.splitext(str(path))[1].lower()
        return MIME_TYPES.get(ext, 'application/octet-stream')

    def version_string(self):
        return self.server_version      # do not reveal the Python version

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _is_public(self):
        path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
        rel = posixpath.normpath(path).lstrip('/')
        if rel in ('', '.'):
            return True                       # the home page
        parts = rel.split('/')
        return '..' not in parts and (rel in PUBLIC_FILES or (parts[0] in PUBLIC_DIRS and len(parts) > 1))

    def do_GET(self):
        if self._is_public():
            super().do_GET()
        else:
            self.send_error(404)

    def do_HEAD(self):
        if self._is_public():
            super().do_HEAD()
        else:
            self.send_error(404)

    def _method_not_allowed(self):
        self.send_response(405)
        self.send_header('Allow', 'GET, HEAD')
        self.send_header('Content-Length', '0')
        self.end_headers()

    do_POST = do_PUT = do_DELETE = do_PATCH = do_OPTIONS = _method_not_allowed

    def end_headers(self):
        for name, value in HEADERS.items():
            self.send_header(name, value)
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write('  %s\n' % (fmt % args))


HEADERS = security_headers()


def make_server(port=8000, host='127.0.0.1'):
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    return http.server.ThreadingHTTPServer((host, port), Handler)


def main(argv=None):
    parser = argparse.ArgumentParser(description='Serve NetSafe locally with security headers.')
    parser.add_argument('--port', type=int, default=8000, help='port to listen on (default 8000)')
    parser.add_argument('--no-browser', action='store_true', help='do not open the browser')
    args = parser.parse_args(argv)
    try:
        server = make_server(args.port)
    except OSError:
        print('Port %d is already in use. Try:  python serve.py --port %d' % (args.port, args.port + 1))
        return 1
    url = 'http://127.0.0.1:%d/' % server.server_address[1]
    print('NetSafe is running at %s\nPress Ctrl+C to stop.\n' % url)
    if not args.no_browser:
        threading.Timer(0.6, webbrowser.open, [url]).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')
    finally:
        server.server_close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
