package br.com.videolab.pessoal;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "VideoLabUpdate")
public class VideoLabUpdatePlugin extends Plugin {
  @PluginMethod
  public void downloadAndInstall(PluginCall call) {
    String apkUrl = call.getString("url");
    Integer remoteVersionCode = call.getInt("versionCode");

    if (apkUrl == null || !apkUrl.startsWith("https://")) {
      call.reject("URL de atualizacao invalida.");
      return;
    }

    if (remoteVersionCode == null) {
      call.reject("versionCode remoto ausente.");
      return;
    }

    int installedVersionCode = getInstalledVersionCode();
    if (remoteVersionCode <= installedVersionCode) {
      JSObject result = new JSObject();
      result.put("upToDate", true);
      result.put("installedVersionCode", installedVersionCode);
      call.resolve(result);
      return;
    }

    new Thread(() -> {
      try {
        File downloadsDir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (downloadsDir == null) {
          call.reject("Nao foi possivel abrir a pasta de downloads do app.");
          return;
        }

        File apkFile = new File(downloadsDir, "VideoLab-update-" + remoteVersionCode + ".apk");
        downloadFile(apkUrl, apkFile);
        openInstaller(apkFile);

        JSObject result = new JSObject();
        result.put("upToDate", false);
        result.put("installedVersionCode", installedVersionCode);
        result.put("downloadedVersionCode", remoteVersionCode);
        result.put("apkPath", apkFile.getAbsolutePath());
        call.resolve(result);
      } catch (Exception exception) {
        call.reject("Falha ao baixar ou instalar atualizacao: " + exception.getMessage());
      }
    }).start();
  }

  private int getInstalledVersionCode() {
    try {
      PackageInfo packageInfo = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        return (int) packageInfo.getLongVersionCode();
      }
      return packageInfo.versionCode;
    } catch (Exception exception) {
      return 0;
    }
  }

  private void downloadFile(String apkUrl, File targetFile) throws Exception {
    HttpURLConnection connection = (HttpURLConnection) new URL(apkUrl).openConnection();
    connection.setConnectTimeout(15000);
    connection.setReadTimeout(30000);
    connection.connect();

    int responseCode = connection.getResponseCode();
    if (responseCode < 200 || responseCode >= 300) {
      throw new IllegalStateException("HTTP " + responseCode);
    }

    try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(targetFile)) {
      byte[] buffer = new byte[8192];
      int bytesRead;
      while ((bytesRead = input.read(buffer)) != -1) {
        output.write(buffer, 0, bytesRead);
      }
    } finally {
      connection.disconnect();
    }
  }

  private void openInstaller(File apkFile) {
    Uri apkUri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apkFile);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
      Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
      settingsIntent.setData(Uri.parse("package:" + getContext().getPackageName()));
      settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getContext().startActivity(settingsIntent);
    }

    Intent installIntent = new Intent(Intent.ACTION_VIEW);
    installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
    installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
    installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    getContext().startActivity(installIntent);
  }
}
