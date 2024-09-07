import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, FlatList, SafeAreaView, StatusBar, TouchableWithoutFeedback, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deleteClientMedia } from '../services/api';
import { Video } from 'expo-av';
const { width: screenWidth } = Dimensions.get('window');

const ImageGallery = ({ media, visible, onClose, initialIndex, onMediaDeleted, clientId }) => {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(initialIndex || 0);
  const [showControls, setShowControls] = useState(true);
  const fullScreenListRef = useRef(null);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    return () => {
      StatusBar.setBarStyle('default');
    };
  }, []);

  const handleDeleteMedia = async () => {
    Alert.alert(
      "Delete Media",
      "Are you sure you want to delete this media?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const mediaToDelete = media[selectedMediaIndex];
              await deleteClientMedia(mediaToDelete.id);
              
              if (typeof onMediaDeleted === 'function') {
                onMediaDeleted(mediaToDelete.id);
              }

              // Update the local state to remove the deleted media
              const updatedMedia = media.filter(item => item.id !== mediaToDelete.id);
              if (updatedMedia.length === 0) {
                // If no media left, close the gallery
                onClose();
              } else {
                // Adjust the selected index if necessary
                setSelectedMediaIndex(prevIndex => 
                  prevIndex >= updatedMedia.length ? updatedMedia.length - 1 : prevIndex
                );
              }
            } catch (error) {
              console.error('Error deleting media:', error);
              Alert.alert("Error", "Failed to delete the media. Please try again.");
            }
          }
        }
      ]
    );
  };

  const renderGridItem = ({ item, index }) => (
    <TouchableOpacity 
      style={styles.gridItem} 
      onPress={() => setSelectedMediaIndex(index)}
    >
      <Image 
        source={{ uri: item.media_type === 'video' ? item.thumbnail_url : item.media_url }} 
        style={styles.gridImage} 
      />
      {item.media_type === 'video' && (
        <View style={styles.videoIndicator}>
          <Ionicons name="play-circle" size={24} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );
  
  const renderFullScreenItem = ({ item }) => (
    <TouchableWithoutFeedback onPress={() => setShowControls(!showControls)}>
      <View style={styles.fullScreenContent}>
        {item.media_type === 'image' ? (
          <Image 
            source={{ uri: item.media_url }} 
            style={styles.fullScreenImage} 
          />
        ) : (
          <Video
            source={{ uri: item.media_url }}
            style={styles.fullScreenVideo}
            useNativeControls
            resizeMode="contain"
            isLooping
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );

  const renderFullScreenView = () => (
    <Modal visible={selectedMediaIndex !== null} transparent={true} animationType="fade">
      <View style={styles.fullScreenContainer}>
        <SafeAreaView style={styles.fullScreenSafeArea}>
          {showControls && (
            <View style={styles.fullScreenHeader}>
              <TouchableOpacity 
                style={styles.fullScreenCloseButton} 
                onPress={() => setSelectedMediaIndex(null)}
              >
                <Ionicons name="chevron-back" size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.fullScreenDeleteButton} 
                onPress={handleDeleteMedia}
              >
                <Ionicons name="trash-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
        <FlatList
          ref={fullScreenListRef}
          data={media}
          renderItem={renderFullScreenItem}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          pagingEnabled
          initialScrollIndex={selectedMediaIndex}
          getItemLayout={(data, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.floor(event.nativeEvent.contentOffset.x / screenWidth);
            setSelectedMediaIndex(newIndex);
          }}
        />
        {showControls && (
          <SafeAreaView style={styles.fullScreenBottomSafeArea}>
            <Text style={styles.fullScreenImageDate}>
              {formatImageDate(media[selectedMediaIndex]?.created_at)}
            </Text>
          </SafeAreaView>
        )}
      </View>
    </Modal>
  );

  const formatImageDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Photos</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={media}
          renderItem={renderGridItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={3}
          contentContainerStyle={styles.gridContainer}
        />
        {renderFullScreenView()}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#0a84ff',
    fontSize: 16,
  },
  gridContainer: {
    padding: 2,
  },
  gridItem: {
    flex: 1/3,
    aspectRatio: 1,
    padding: 2,
    position: 'relative', // Add this
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  videoIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  fullScreenSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  fullScreenBottomSafeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  fullScreenCloseButton: {
    padding: 16,
  },
  fullScreenImageDate: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    padding: 16,
  },
  fullScreenContent: {
    flex: 1,
    justifyContent: 'center',
    width: screenWidth,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  fullScreenVideo: {
    width: '100%',
    height: '100%',
  },
  fullScreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },
  fullScreenDeleteButton: {
    padding: 16,
  },
});

export default ImageGallery;