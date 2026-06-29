package br.com.videolab.pessoal;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(VideoLabUpdatePlugin.class);
    super.onCreate(savedInstanceState);
  }
}
