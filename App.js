import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { WebView } from 'react-native-webview';
import Slider from '@react-native-community/slider';

// DANH SÁCH CÁC TONE MÀU (PRESETS)
const PRESETS = [
  {
    id: 0,
    name: 'Japan Summer',
    tag: '🇯🇵 Mùa hè Nhật',
    desc: 'Bầu trời xanh ngọc Cyan, cây xanh non Anime, nắng ấm Makoto Shinkai',
    color: '#00c0ff',
  },
  {
    id: 1,
    name: 'Kodak Portra',
    tag: '🎞️ Màu Phim Cổ',
    desc: 'Tông màu phim ấm áp hoài niệm, da ấm, hạt phim tự nhiên',
    color: '#f39c12',
  },
  {
    id: 2,
    name: 'Teal & Orange',
    tag: '🎬 Điện Ảnh Cyber',
    desc: 'Tone Hollywood tương phản cao: bóng xanh biển, ánh sáng cam rực rỡ',
    color: '#00e5ff',
  },
  {
    id: 3,
    name: 'Moody Forest',
    tag: '🌲 Rừng Thông Lạnh',
    desc: 'Tone trầm u tối, xanh rêu trầm, tĩnh lặng và bí ẩn',
    color: '#27ae60',
  },
  {
    id: 4,
    name: 'Korean Pastel',
    tag: '🌸 Hàn Quốc Trong Trẻo',
    desc: 'Sáng trong veo, da trắng hồng đào, tương phản nhẹ mơ màng',
    color: '#ff758c',
  },
  {
    id: 5,
    name: 'Classic B&W',
    tag: '🖤 Đen Trắng Noir',
    desc: 'Trắng đen điện ảnh với độ tương phản sâu và chiều sâu ấn tượng',
    color: '#bdc3c7',
  },
];

const getWebGLEngineHTML = (initialImageUri) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 100%; height: 100%; overflow: hidden; background: #121212; display: flex; align-items: center; justify-content: center; }
    canvas { max-width: 100%; max-height: 100%; object-fit: contain; }
  </style>
</head>
<body>
  <canvas id="glcanvas"></canvas>
  <script>
    const canvas = document.getElementById('glcanvas');
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });

    const vsSource = \`
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    \`;

    const fsSource = \`
      precision highp float;
      varying vec2 v_texCoord;
      uniform sampler2D u_image;
      uniform int u_presetId;
      uniform float u_intensity;
      uniform float u_exposure;
      uniform float u_contrast;
      uniform float u_temp;
      uniform float u_showOriginal;

      vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }

      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      void main() {
        vec4 color = texture2D(u_image, v_texCoord);
        if (u_showOriginal > 0.5) {
          gl_FragColor = color;
          return;
        }

        vec3 orig = color.rgb;
        vec3 c = color.rgb;

        // Cơ bản: Phơi sáng & Tương phản & Nhiệt độ
        c = c * pow(2.0, u_exposure * 1.2);
        c = (c - 0.5) * (1.0 + u_contrast * 0.5) + 0.5;
        c.r += u_temp * 0.08;
        c.b -= u_temp * 0.08;
        c = clamp(c, 0.0, 1.0);

        vec3 targetColor = c;

        // ==========================================
        // 1. JAPAN SUMMER (Mùa hè Nhật Bản / Anime)
        // ==========================================
        if (u_presetId == 0) {
          // Nâng màng phim matte đen
          c = 0.06 + 0.94 * pow(c, vec3(0.88));
          c.r += 0.03; c.g += 0.02;

          vec3 hsv = rgb2hsv(c);
          // Trời Blue -> Cyan ngọc bích
          if (hsv.x >= 0.52 && hsv.x <= 0.74) {
            float w = clamp(1.0 - abs(hsv.x - 0.63) / 0.13, 0.0, 1.0);
            hsv.x = mix(hsv.x, 0.51, w * 0.8);
            hsv.y = mix(hsv.y, hsv.y * 0.85, w);
            hsv.z = clamp(hsv.z * (1.0 + w * 0.22), 0.0, 1.0);
          }
          // Cây Green -> Xanh mạ non ấm
          if (hsv.x >= 0.19 && hsv.x <= 0.46) {
            float w = clamp(1.0 - abs(hsv.x - 0.33) / 0.15, 0.0, 1.0);
            hsv.x = mix(hsv.x, 0.22, w * 0.55);
            hsv.y = clamp(hsv.y * (1.0 + w * 0.25), 0.0, 1.0);
            hsv.z = clamp(hsv.z * (1.0 + w * 0.32), 0.0, 1.0);
          }
          // Nắng ấm
          if (hsv.x <= 0.15 || hsv.x >= 0.90) {
            hsv.y = clamp(hsv.y * 1.2, 0.0, 1.0);
          }
          c = hsv2rgb(hsv);
          // Split toning
          float lum = dot(c, vec3(0.299, 0.587, 0.114));
          c.b += clamp(1.0 - lum * 2.0, 0.0, 1.0) * 0.035;
          c.r += clamp(lum * 2.0 - 1.0, 0.0, 1.0) * 0.035;
          targetColor = c;
        }

        // ==========================================
        // 2. KODAK PORTRA (Màu Phim Cổ Điển)
        // ==========================================
        else if (u_presetId == 1) {
          // Màu vàng kim ấm áp, làm mềm tương phản
          c = 0.04 + 0.96 * pow(c, vec3(0.92));
          c.r *= 1.08;
          c.g *= 1.03;
          c.b *= 0.92;
          vec3 hsv = rgb2hsv(c);
          // Lá cây ngả màu rêu cổ điển
          if (hsv.x >= 0.20 && hsv.x <= 0.45) {
            hsv.x = mix(hsv.x, 0.18, 0.4);
            hsv.y *= 0.85;
          }
          // Tăng màu cam da người
          if (hsv.x >= 0.05 && hsv.x <= 0.15) {
            hsv.y *= 1.15;
          }
          c = hsv2rgb(hsv);
          targetColor = c;
        }

        // ==========================================
        // 3. TEAL & ORANGE (Điện ảnh Hollywood)
        // ==========================================
        else if (u_presetId == 2) {
          // Tăng tương phản S-curve
          c = smoothstep(0.0, 1.0, c);
          vec3 hsv = rgb2hsv(c);
          // Màu lạnh kéo hết sang Teal
          if (hsv.x > 0.45 && hsv.x < 0.80) {
            hsv.x = 0.52;
            hsv.y = clamp(hsv.y * 1.3, 0.0, 1.0);
          }
          // Màu nóng kéo hết sang Orange
          if (hsv.x < 0.20 || hsv.x > 0.85) {
            hsv.x = 0.08;
            hsv.y = clamp(hsv.y * 1.35, 0.0, 1.0);
          }
          c = hsv2rgb(hsv);
          float lum = dot(c, vec3(0.299, 0.587, 0.114));
          // Bóng ám Teal sâu
          c.b += clamp(1.0 - lum * 1.8, 0.0, 1.0) * 0.07;
          c.g += clamp(1.0 - lum * 1.8, 0.0, 1.0) * 0.03;
          // Sáng ám Cam rực
          c.r += clamp(lum * 1.8 - 0.8, 0.0, 1.0) * 0.06;
          targetColor = c;
        }

        // ==========================================
        // 4. MOODY FOREST (Rừng thông u trầm)
        // ==========================================
        else if (u_presetId == 3) {
          c = pow(c, vec3(1.15)); // Dìm sáng
          vec3 hsv = rgb2hsv(c);
          // Cây xanh lá ngả xanh rêu lạnh, dìm saturation
          if (hsv.x >= 0.18 && hsv.x <= 0.48) {
            hsv.x = 0.38; // ngả xanh ngọc lạnh
            hsv.y *= 0.65;
            hsv.z *= 0.85;
          }
          // Dìm màu vàng
          if (hsv.x >= 0.12 && hsv.x < 0.20) {
            hsv.y *= 0.4;
          }
          c = hsv2rgb(hsv);
          // Ám lạnh toàn cảnh
          c.b += 0.03;
          targetColor = c;
        }

        // ==========================================
        // 5. KOREAN PASTEL (Trong trẻo Hàn Quốc)
        // ==========================================
        else if (u_presetId == 4) {
          // Tăng sáng và giảm contrast
          c = 0.08 + 0.92 * pow(c, vec3(0.82));
          c.r += 0.04;
          c.g += 0.02;
          c.b += 0.03; // hơi hồng phấn nhẹ
          vec3 hsv = rgb2hsv(c);
          hsv.y *= 0.85; // Pastel nhẹ nhàng
          hsv.z = clamp(hsv.z * 1.1, 0.0, 1.0);
          c = hsv2rgb(hsv);
          targetColor = c;
        }

        // ==========================================
        // 6. CLASSIC NOIR B&W (Đen trắng điện ảnh)
        // ==========================================
        else if (u_presetId == 5) {
          float gray = dot(c, vec3(0.299, 0.587, 0.114));
          // Đường cong tương phản cao
          gray = smoothstep(0.08, 0.92, gray);
          targetColor = vec3(gray);
        }

        targetColor = clamp(targetColor, 0.0, 1.0);
        vec3 finalColor = mix(orig, targetColor, u_intensity);
        gl_FragColor = vec4(finalColor, color.a);
      }
    \`;

    function createShader(gl, type, source) {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      return s;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const texBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,1, 1,1, 0,0, 0,0, 1,1, 1,0]), gl.STATIC_DRAW);
    const aTex = gl.getAttribLocation(prog, 'a_texCoord');
    gl.enableVertexAttribArray(aTex);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let uniforms = {
      presetId: 0,
      intensity: 1.0,
      exposure: 0.0,
      contrast: 0.0,
      temp: 0.0,
      showOriginal: 0.0
    };

    let imgElement = new Image();
    imgElement.crossOrigin = 'anonymous';
    imgElement.onload = function() {
      canvas.width = imgElement.width;
      canvas.height = imgElement.height;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgElement);
      render();
    };

    function render() {
      if (!imgElement.complete || !imgElement.naturalWidth) return;
      gl.uniform1i(gl.getUniformLocation(prog, 'u_presetId'), uniforms.presetId);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_intensity'), uniforms.intensity);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_exposure'), uniforms.exposure);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_contrast'), uniforms.contrast);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_temp'), uniforms.temp);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_showOriginal'), uniforms.showOriginal);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    window.updateUniforms = function(newVals) {
      Object.assign(uniforms, newVals);
      render();
    };

    window.loadImage = function(src) {
      imgElement.src = src;
    };

    window.exportImage = function() {
      render();
      const base64 = canvas.toDataURL('image/jpeg', 0.95);
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'EXPORT', base64: base64 }));
    };

    ${initialImageUri ? `loadImage("${initialImageUri}");` : ''}
  </script>
</body>
</html>
`;

export default function App() {
  const [imageUri, setImageUri] = useState(null);
  const [selectedPresetId, setSelectedPresetId] = useState(0);
  const [activeTab, setActiveTab] = useState('intensity');
  const [params, setParams] = useState({
    intensity: 1.0,
    exposure: 0.0,
    contrast: 0.0,
    temp: 0.0,
  });
  const [isComparing, setIsComparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const webViewRef = useRef(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập ảnh trong Cài đặt iPhone.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const selected = result.assets[0];
      const base64Uri = `data:image/jpeg;base64,${selected.base64}`;
      setImageUri(base64Uri);
      sendToWebView(`window.loadImage("${base64Uri}");`);
    }
  };

  const sendToWebView = (code) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(code + '; true;');
    }
  };

  const selectPreset = (id) => {
    setSelectedPresetId(id);
    sendToWebView(`window.updateUniforms({ presetId: ${id} });`);
  };

  const updateParam = (key, value) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    sendToWebView(`window.updateUniforms(${JSON.stringify({ [key]: value })});`);
  };

  const handleCompareStart = () => {
    setIsComparing(true);
    sendToWebView('window.updateUniforms({ showOriginal: 1.0 });');
  };

  const handleCompareEnd = () => {
    setIsComparing(false);
    sendToWebView('window.updateUniforms({ showOriginal: 0.0 });');
  };

  const handleSaveImage = () => {
    if (!imageUri) {
      Alert.alert('Chưa có ảnh', 'Vui lòng chọn một ảnh trước khi lưu!');
      return;
    }
    setSaving(true);
    sendToWebView('window.exportImage();');
  };

  const onWebViewMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'EXPORT') {
        const base64Data = data.base64.replace('data:image/jpeg;base64,', '');
        const filename = `${FileSystem.cacheDirectory}BePicture_${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(filename, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.createAssetAsync(filename);
          Alert.alert('Thành công! 🎉', 'Ảnh đã lưu vào Album ảnh iPhone của bạn.');
        } else {
          Alert.alert('Lỗi', 'Không có quyền lưu ảnh vào Thư viện.');
        }
        setSaving(false);
      }
    } catch (e) {
      Alert.alert('Lỗi', e.message);
      setSaving(false);
    }
  };

  const currentPreset = PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.badge}><Text style={styles.badgeText}>BP</Text></View>
          <Text style={styles.title}>BÉ PICTURE</Text>
        </View>

        <View style={styles.headerActions}>
          {imageUri && (
            <TouchableOpacity
              style={[styles.btnSecondary, isComparing && styles.btnActive]}
              onPressIn={handleCompareStart}
              onPressOut={handleCompareEnd}
              activeOpacity={0.8}
            >
              <Text style={styles.btnSecondaryText}>
                {isComparing ? 'Ảnh Gốc' : 'Giữ xem gốc'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.btnPrimary} onPress={pickImage}>
            <Text style={styles.btnPrimaryText}>{imageUri ? 'Đổi ảnh' : '+ Chọn ảnh'}</Text>
          </TouchableOpacity>

          {imageUri && (
            <TouchableOpacity
              style={[styles.btnSave, saving && { opacity: 0.6 }]}
              onPress={handleSaveImage}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.btnSaveText}>Lưu</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* PREVIEW CANVAS */}
      <View style={styles.previewContainer}>
        {imageUri ? (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: getWebGLEngineHTML(imageUri) }}
            style={styles.webview}
            onMessage={onWebViewMessage}
            scrollEnabled={false}
          />
        ) : (
          <TouchableOpacity style={styles.emptyState} onPress={pickImage} activeOpacity={0.8}>
            <Text style={styles.emptyIcon}>📷</Text>
            <Text style={styles.emptyTitle}>Chạm để chọn ảnh từ iPhone</Text>
            <Text style={styles.emptySubtitle}>
              Chuyển đổi tức thì sang 6 style màu: Nhật Bản, Phim Kodak, Teal & Orange, Rừng thông, Hàn Quốc, Noir...
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* BOTTOM CONTROLS */}
      {imageUri && (
        <View style={styles.controlsPanel}>
          {/* CAROUSEL CHỌN PRESET (1 CHẠM LÀ ĐỔI STYLE) */}
          <View style={styles.presetSection}>
            <Text style={styles.sectionTitle}>CHỌN STYLE MÀU:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
              {PRESETS.map((p) => {
                const isSelected = p.id === selectedPresetId;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.presetCard,
                      isSelected && { borderColor: p.color, backgroundColor: '#252525' },
                    ]}
                    onPress={() => selectPreset(p.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.presetDot, { backgroundColor: p.color }]} />
                    <Text style={[styles.presetName, isSelected && { color: '#fff', fontWeight: 'bold' }]}>
                      {p.tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={styles.presetDesc}>{currentPreset.desc}</Text>
          </View>

          {/* SLIDER ĐIỀU CHỈNH CHI TIẾT */}
          <View style={styles.sliderSection}>
            {activeTab === 'intensity' && (
              <View>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Độ đậm style ({currentPreset.name}):</Text>
                  <Text style={[styles.sliderValue, { color: currentPreset.color }]}>
                    {Math.round(params.intensity * 100)}%
                  </Text>
                </View>
                <Slider
                  minimumValue={0.0}
                  maximumValue={1.0}
                  value={params.intensity}
                  onValueChange={(val) => updateParam('intensity', val)}
                  minimumTrackTintColor={currentPreset.color}
                  maximumTrackTintColor="#333"
                  thumbTintColor={currentPreset.color}
                />
              </View>
            )}

            {activeTab === 'exposure' && (
              <View>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>☀️ Độ phơi sáng (Exposure):</Text>
                  <Text style={styles.sliderValue}>
                    {params.exposure > 0 ? `+${params.exposure.toFixed(2)}` : params.exposure.toFixed(2)}
                  </Text>
                </View>
                <Slider
                  minimumValue={-0.6}
                  maximumValue={0.8}
                  value={params.exposure}
                  onValueChange={(val) => updateParam('exposure', val)}
                  minimumTrackTintColor="#f39c12"
                  maximumTrackTintColor="#333"
                  thumbTintColor="#f39c12"
                />
              </View>
            )}

            {activeTab === 'contrast' && (
              <View>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>🌓 Độ tương phản (Contrast):</Text>
                  <Text style={styles.sliderValue}>{Math.round(params.contrast * 100)}</Text>
                </View>
                <Slider
                  minimumValue={-0.6}
                  maximumValue={0.8}
                  value={params.contrast}
                  onValueChange={(val) => updateParam('contrast', val)}
                  minimumTrackTintColor="#e74c3c"
                  maximumTrackTintColor="#333"
                  thumbTintColor="#e74c3c"
                />
              </View>
            )}

            {activeTab === 'temp' && (
              <View>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>🌡️ Nhiệt độ màu (Lạnh / Ấm):</Text>
                  <Text style={styles.sliderValue}>
                    {params.temp > 0 ? `Ấm +${params.temp.toFixed(2)}` : params.temp < 0 ? `Lạnh ${params.temp.toFixed(2)}` : '0'}
                  </Text>
                </View>
                <Slider
                  minimumValue={-0.4}
                  maximumValue={0.4}
                  value={params.temp}
                  onValueChange={(val) => updateParam('temp', val)}
                  minimumTrackTintColor="#3498db"
                  maximumTrackTintColor="#333"
                  thumbTintColor="#3498db"
                />
              </View>
            )}
          </View>

          {/* TAB CHUYỂN THANH TRƯỢT */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'intensity' && styles.tabItemActive]}
              onPress={() => setActiveTab('intensity')}
            >
              <Text style={[styles.tabText, activeTab === 'intensity' && styles.tabTextActive]}>Cường độ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'exposure' && styles.tabItemActive]}
              onPress={() => setActiveTab('exposure')}
            >
              <Text style={[styles.tabText, activeTab === 'exposure' && styles.tabTextActive]}>Phơi sáng</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'contrast' && styles.tabItemActive]}
              onPress={() => setActiveTab('contrast')}
            >
              <Text style={[styles.tabText, activeTab === 'contrast' && styles.tabTextActive]}>Tương phản</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'temp' && styles.tabItemActive]}
              onPress={() => setActiveTab('temp')}
            >
              <Text style={[styles.tabText, activeTab === 'temp' && styles.tabTextActive]}>Ấm / Lạnh</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#001d26',
    borderWidth: 1,
    borderColor: '#00c0ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: {
    color: '#00c0ff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#282828',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    marginRight: 8,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  btnSecondary: {
    backgroundColor: '#1f1f1f',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  btnActive: {
    borderColor: '#00c0ff',
    backgroundColor: '#002833',
  },
  btnSecondaryText: {
    color: '#bbb',
    fontSize: 12,
  },
  btnSave: {
    backgroundColor: '#007aff',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  btnSaveText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webview: {
    flex: 1,
    width: '100%',
    backgroundColor: '#0a0a0a',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 54,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  controlsPanel: {
    backgroundColor: '#181818',
    borderTopWidth: 1,
    borderTopColor: '#282828',
    paddingBottom: Platform.OS === 'ios' ? 12 : 16,
  },
  presetSection: {
    paddingTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  sectionTitle: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  presetScroll: {
    paddingHorizontal: 12,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202020',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#2d2d2d',
  },
  presetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  presetName: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '500',
  },
  presetDesc: {
    color: '#888',
    fontSize: 11,
    fontStyle: 'italic',
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
  },
  sliderSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    minHeight: 70,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sliderLabel: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '500',
  },
  sliderValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabScroll: {
    paddingHorizontal: 12,
    marginTop: 6,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 6,
    backgroundColor: '#222',
  },
  tabItemActive: {
    backgroundColor: '#303030',
    borderBottomWidth: 2,
    borderBottomColor: '#00c0ff',
  },
  tabText: {
    color: '#777',
    fontSize: 12,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
});
