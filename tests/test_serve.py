"""Tests for serve.py (standard library only). Run: python -m unittest discover -s tests -p "test_*.py" """
import http.client
import pathlib
import re
import sys
import threading
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import serve  # noqa: E402


class ServeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = serve.make_server(0)           # port 0: any free port
        cls.port = cls.server.server_address[1]
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def get(self, path, method='GET'):
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=5)
        conn.request(method, path)
        res = conn.getresponse()
        body = res.read()
        conn.close()
        return res, body

    def test_listens_only_on_this_computer(self):
        self.assertEqual(self.server.server_address[0], '127.0.0.1')

    def test_home_page_is_served(self):
        res, body = self.get('/')
        self.assertEqual(res.status, 200)
        self.assertIn(b'NetSafe', body)

    def test_app_files_are_served_with_correct_types(self):
        for path, kind in (('/js/nav.js', 'javascript'), ('/css/style.css', 'text/css'), ('/assets/images/netsafe-logo.png', 'image/png'), ('/index.html', 'text/html')):
            res, _ = self.get(path)
            self.assertEqual(res.status, 200, path)
            self.assertIn(kind, res.getheader('Content-Type'), path)

    def test_security_headers_on_every_response(self):
        for path in ('/', '/js/nav.js', '/nope'):
            res, _ = self.get(path)
            self.assertEqual(res.getheader('X-Content-Type-Options'), 'nosniff', path)
            self.assertEqual(res.getheader('Referrer-Policy'), 'no-referrer', path)
            self.assertIn("default-src 'none'", res.getheader('Content-Security-Policy'), path)
            self.assertIn("frame-ancestors 'none'", res.getheader('Content-Security-Policy'), path)
            self.assertEqual(res.getheader('Cross-Origin-Resource-Policy'), 'same-origin', path)

    def test_header_policy_comes_from_index_html_and_is_stricter(self):
        html = (ROOT / 'index.html').read_text(encoding='utf-8')
        meta = re.search(r'Content-Security-Policy"\s+content="([^"]+)"', html).group(1)
        header = self.get('/')[0].getheader('Content-Security-Policy')
        self.assertTrue(header.startswith(meta.replace(' file:', '')))
        self.assertNotIn('file:', header)

    def test_policy_has_no_remote_sources_or_unsafe_keywords(self):
        header = self.get('/')[0].getheader('Content-Security-Policy')
        for bad in ('unsafe-inline', 'unsafe-eval', 'http:', 'https:', '*'):
            self.assertNotIn(bad, header)

    def test_files_outside_the_app_are_not_reachable(self):
        for path in ('/serve.py', '/README.md', '/package.json', '/tests/test_serve.py', '/tests/browser/browser_tests.py', '/docs/', '/js/', '/css/', '/assets/'):
            self.assertEqual(self.get(path)[0].status, 404, path)

    def test_path_traversal_is_rejected(self):
        for path in ('/../serve.py', '/%2e%2e/serve.py', '/js/../serve.py', '/js/%2e%2e/%2e%2e/serve.py', '/..%2f..%2fserve.py', '//etc/passwd', '/js/..%5cserve.py'):
            self.assertEqual(self.get(path)[0].status, 404, path)

    def test_query_string_does_not_change_what_is_served(self):
        self.assertEqual(self.get('/index.html?x=1#y')[0].status, 200)
        self.assertEqual(self.get('/serve.py?/js/nav.js')[0].status, 404)

    def test_head_returns_headers_without_a_body(self):
        res, body = self.get('/', 'HEAD')
        self.assertEqual(res.status, 200)
        self.assertEqual(body, b'')
        self.assertIn('nosniff', res.getheader('X-Content-Type-Options'))

    def test_only_get_and_head_are_allowed(self):
        for method in ('POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'):
            res, _ = self.get('/', method)
            self.assertEqual(res.status, 405, method)
            self.assertEqual(res.getheader('Allow'), 'GET, HEAD')

    def test_server_does_not_reveal_python_or_version(self):
        res, _ = self.get('/')
        self.assertEqual(res.getheader('Server'), 'NetSafe')

    def test_scripts_and_styles_have_correct_types(self):
        # Browsers refuse scripts served as text/plain when nosniff is set, so every button would stop working.
        for path, want in (('/js/url.js', 'text/javascript'), ('/css/style.css', 'text/css'), ('/', 'text/html'),
                           ('/assets/images/favicon-32.png', 'image/png')):
            res, _ = self.get(path)
            self.assertEqual(res.status, 200, path)
            self.assertTrue(res.getheader('Content-Type').startswith(want), path + ' ' + res.getheader('Content-Type'))

    def test_types_ignore_a_broken_system_mime_table(self):
        # Windows often maps .js to text/plain in the registry; serve.py must not inherit that.
        import mimetypes
        saved = dict(mimetypes.types_map)
        try:
            mimetypes.add_type('text/plain', '.js')
            mimetypes.add_type('text/plain', '.css')
            res, _ = self.get('/js/nav.js')
            self.assertTrue(res.getheader('Content-Type').startswith('text/javascript'), res.getheader('Content-Type'))
            res, _ = self.get('/css/style.css')
            self.assertTrue(res.getheader('Content-Type').startswith('text/css'), res.getheader('Content-Type'))
        finally:
            mimetypes.types_map.clear()
            mimetypes.types_map.update(saved)

    def test_port_in_use_gives_a_friendly_message(self):
        import io, contextlib
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = serve.main(['--port', str(self.port), '--no-browser'])
        self.assertEqual(code, 1)
        self.assertIn('already in use', out.getvalue())


if __name__ == '__main__':
    unittest.main()
