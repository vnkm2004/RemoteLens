package com.remotecamera.sync;

import android.net.http.SslError;
import android.os.Bundle;
import android.webkit.SslErrorHandler;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setWebViewClient(new BridgeWebViewClient(bridge) {
                @Override
                public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                    // Auto-trust self-signed certs for local Wi-Fi and Hotspot camera connections
                    handler.proceed();
                }
            });
        }
    }
}
