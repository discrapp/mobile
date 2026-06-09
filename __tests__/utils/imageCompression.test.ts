import {
  compressImage,
  getImageDimensions,
  calculateResizeDimensions,
  DEFAULT_MAX_DIMENSION,
  DEFAULT_COMPRESSION_QUALITY,
} from '../../utils/imageCompression';
import * as ImageManipulator from 'expo-image-manipulator';

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
  },
}));

// Mock Image.getSize for React Native
jest.mock('react-native', () => ({
  Image: {
    getSize: jest.fn(),
  },
}));

import { Image } from 'react-native';

describe('imageCompression', async () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DEFAULT_MAX_DIMENSION', async () => {
    it('should be 1920', async () => {
      expect(DEFAULT_MAX_DIMENSION).toBe(1920);
    });
  });

  describe('DEFAULT_COMPRESSION_QUALITY', async () => {
    it('should be 0.8 (80%)', async () => {
      expect(DEFAULT_COMPRESSION_QUALITY).toBe(0.8);
    });
  });

  describe('getImageDimensions', async () => {
    it('should return width and height for a valid image URI', async () => {
      (Image.getSize as jest.Mock).mockImplementation(
        (uri, success) => {
          success(1000, 800);
        }
      );

      const result = await getImageDimensions('file://test.jpg');
      expect(result).toEqual({ width: 1000, height: 800 });
    });

    it('should reject when Image.getSize fails', async () => {
      (Image.getSize as jest.Mock).mockImplementation(
        (uri, success, failure) => {
          failure(new Error('Failed to get image size'));
        }
      );

      await expect(getImageDimensions('file://test.jpg')).rejects.toThrow(
        'Failed to get image size'
      );
    });
  });

  describe('calculateResizeDimensions', async () => {
    it('should not resize if image is smaller than max dimension', async () => {
      const result = calculateResizeDimensions(800, 600, 1920);
      expect(result).toBeNull();
    });

    it('should resize landscape image to max width', async () => {
      const result = calculateResizeDimensions(3840, 2160, 1920);
      expect(result).toEqual({ width: 1920, height: 1080 });
    });

    it('should resize portrait image to max height', async () => {
      const result = calculateResizeDimensions(2160, 3840, 1920);
      expect(result).toEqual({ width: 1080, height: 1920 });
    });

    it('should resize square image correctly', async () => {
      const result = calculateResizeDimensions(4000, 4000, 1920);
      expect(result).toEqual({ width: 1920, height: 1920 });
    });

    it('should handle exact max dimension', async () => {
      const result = calculateResizeDimensions(1920, 1080, 1920);
      expect(result).toBeNull();
    });

    it('should use custom max dimension', async () => {
      const result = calculateResizeDimensions(2000, 1500, 1000);
      expect(result).toEqual({ width: 1000, height: 750 });
    });
  });

  describe('compressImage', async () => {
    it('should compress and resize a large image', async () => {
      (Image.getSize as jest.Mock).mockImplementation(
        (uri, success) => {
          success(3840, 2160);
        }
      );

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'file://compressed.jpg',
        width: 1920,
        height: 1080,
      });

      const result = await compressImage('file://original.jpg');

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file://original.jpg',
        [{ resize: { width: 1920, height: 1080 } }],
        { compress: 0.8, format: 'jpeg' }
      );
      expect(result).toEqual({
        uri: 'file://compressed.jpg',
        width: 1920,
        height: 1080,
      });
    });

    it('should only compress (not resize) a small image', async () => {
      (Image.getSize as jest.Mock).mockImplementation(
        (uri, success) => {
          success(800, 600);
        }
      );

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'file://compressed.jpg',
        width: 800,
        height: 600,
      });

      const result = await compressImage('file://original.jpg');

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file://original.jpg',
        [],
        { compress: 0.8, format: 'jpeg' }
      );
      expect(result).toEqual({
        uri: 'file://compressed.jpg',
        width: 800,
        height: 600,
      });
    });

    it('should use custom options', async () => {
      (Image.getSize as jest.Mock).mockImplementation(
        (uri, success) => {
          success(2000, 1500);
        }
      );

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'file://compressed.jpg',
        width: 1000,
        height: 750,
      });

      await compressImage('file://original.jpg', {
        maxDimension: 1000,
        quality: 0.5,
      });

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file://original.jpg',
        [{ resize: { width: 1000, height: 750 } }],
        { compress: 0.5, format: 'jpeg' }
      );
    });

    it('should throw error if manipulation fails', async () => {
      (Image.getSize as jest.Mock).mockImplementation(
        (uri, success) => {
          success(800, 600);
        }
      );

      (ImageManipulator.manipulateAsync as jest.Mock).mockRejectedValue(
        new Error('Manipulation failed')
      );

      await expect(compressImage('file://original.jpg')).rejects.toThrow(
        'Manipulation failed'
      );
    });
  });
});
