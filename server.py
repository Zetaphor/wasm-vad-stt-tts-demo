import http.server
import ssl

def run_server():
    server_address = ('localhost', 4443)
    handler = http.server.SimpleHTTPRequestHandler

    # Create an SSL context
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain('cert.pem', 'key.pem')

    # Create the HTTPS server
    httpd = http.server.HTTPServer(server_address, handler)
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

    print(f"Serving HTTPS on {server_address[0]} port {server_address[1]} (https://{server_address[0]}:{server_address[1]}/) ...")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()