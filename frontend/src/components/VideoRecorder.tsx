import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface VideoRecorderProps {
  onRecordingComplete: (uris: string[]) => void;
  onClose: () => void;
  visible: boolean;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ onRecordingComplete, onClose, visible }) => {
  const launchVideoRecorder = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      onRecordingComplete([result.assets[0].uri]);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={launchVideoRecorder}>
          <Text style={styles.buttonText}>Record Video</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  preview: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 15,
    borderRadius: 30,
    marginHorizontal: 10,
  },
  recordButton: {
    backgroundColor: 'red',
  },
  stopButton: {
    backgroundColor: 'white',
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 15,
    borderRadius: 30,
    position: 'absolute',
    top: -50,
    right: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default VideoRecorder;