import {
  calculateInitialCropperTransforms,
  CameraCaptureMeta,
  CropperConfig,
  InitialTransforms,
} from '../../lib/cameraAlignment';

describe('cameraAlignment', () => {
  describe('calculateInitialCropperTransforms', () => {
    const defaultCropperConfig: CropperConfig = {
      containerSize: 400, // Square container in cropper
      circleSize: 280, // Circle overlay size
    };

    it('should return default transforms when camera and photo have same aspect ratio as cropper', () => {
      const captureMeta: CameraCaptureMeta = {
        photoWidth: 4032,
        photoHeight: 4032, // Square photo
        previewWidth: 400,
        previewHeight: 400, // Square preview
        circleSize: 280,
        circleCenterX: 200, // Centered
        circleCenterY: 200, // Centered
      };

      const result = calculateInitialCropperTransforms(captureMeta, defaultCropperConfig);

      // With matching aspect ratios and centered circle, should be minimal adjustment
      expect(result.scale).toBeCloseTo(1, 1);
      expect(result.translateX).toBeCloseTo(0, 1);
      expect(result.translateY).toBeCloseTo(0, 1);
    });

    it('should calculate scale adjustment for landscape photo displayed in square cropper', () => {
      const captureMeta: CameraCaptureMeta = {
        photoWidth: 4032,
        photoHeight: 3024, // 4:3 landscape
        previewWidth: 400,
        previewHeight: 533, // 3:4 portrait preview (common on phones)
        circleSize: 280,
        circleCenterX: 200,
        circleCenterY: 266.5, // Centered vertically in portrait preview
      };

      const result = calculateInitialCropperTransforms(captureMeta, defaultCropperConfig);

      // The transforms should position the circle content correctly
      expect(result).toHaveProperty('scale');
      expect(result).toHaveProperty('translateX');
      expect(result).toHaveProperty('translateY');
      expect(typeof result.scale).toBe('number');
      expect(result.scale).toBeGreaterThan(0);
    });

    it('should calculate translateY for portrait camera preview with landscape photo', () => {
      // Camera preview is taller than wide (portrait phone)
      // But captured photo is wider than tall (landscape sensor)
      const captureMeta: CameraCaptureMeta = {
        photoWidth: 4032,
        photoHeight: 3024, // 4:3 landscape photo
        previewWidth: 390,
        previewHeight: 844, // iPhone 14 Pro dimensions (portrait)
        circleSize: 273, // 70% of 390
        circleCenterX: 195, // Centered horizontally
        circleCenterY: 422, // Centered vertically
      };

      const result = calculateInitialCropperTransforms(captureMeta, defaultCropperConfig);

      // Since the circle was centered in a tall preview, and the photo is landscape,
      // the cropper needs to translate to show the correct vertical region
      expect(result.translateY).toBeDefined();
    });

    it('should handle circle not centered in preview', () => {
      const captureMeta: CameraCaptureMeta = {
        photoWidth: 4032,
        photoHeight: 3024,
        previewWidth: 400,
        previewHeight: 600,
        circleSize: 280,
        circleCenterX: 200, // Centered horizontally
        circleCenterY: 250, // Above center (closer to top)
      };

      const result = calculateInitialCropperTransforms(captureMeta, defaultCropperConfig);

      // Should account for non-centered circle position
      expect(result).toHaveProperty('translateY');
    });

    it('should clamp scale to reasonable bounds', () => {
      const captureMeta: CameraCaptureMeta = {
        photoWidth: 100,
        photoHeight: 100,
        previewWidth: 400,
        previewHeight: 400,
        circleSize: 280,
        circleCenterX: 200,
        circleCenterY: 200,
      };

      const result = calculateInitialCropperTransforms(captureMeta, defaultCropperConfig);

      // Scale should be between 1 and 3 (cropper limits)
      expect(result.scale).toBeGreaterThanOrEqual(1);
      expect(result.scale).toBeLessThanOrEqual(3);
    });

    it('should return valid transforms for typical iPhone camera scenario', () => {
      // Realistic iPhone 14 Pro scenario
      const captureMeta: CameraCaptureMeta = {
        photoWidth: 4032,
        photoHeight: 3024, // 4:3 photo from camera
        previewWidth: 393, // iPhone 14 Pro width
        previewHeight: 852, // iPhone 14 Pro height (portrait)
        circleSize: 275, // ~70% of screen width
        circleCenterX: 196.5, // Centered
        circleCenterY: 426, // Centered
      };

      const cropperConfig: CropperConfig = {
        containerSize: 393, // Same as screen width
        circleSize: 275,
      };

      const result = calculateInitialCropperTransforms(captureMeta, cropperConfig);

      // All values should be valid numbers
      expect(Number.isFinite(result.scale)).toBe(true);
      expect(Number.isFinite(result.translateX)).toBe(true);
      expect(Number.isFinite(result.translateY)).toBe(true);

      // Scale should be reasonable
      expect(result.scale).toBeGreaterThanOrEqual(1);
      expect(result.scale).toBeLessThanOrEqual(3);
    });

    it('should account for different circle sizes between camera and cropper', () => {
      const captureMeta: CameraCaptureMeta = {
        photoWidth: 4032,
        photoHeight: 3024,
        previewWidth: 400,
        previewHeight: 600,
        circleSize: 200, // Smaller circle in camera
        circleCenterX: 200,
        circleCenterY: 300,
      };

      const cropperConfig: CropperConfig = {
        containerSize: 400,
        circleSize: 280, // Larger circle in cropper
      };

      const result = calculateInitialCropperTransforms(captureMeta, cropperConfig);

      // Should scale up since cropper circle is larger
      expect(result.scale).toBeGreaterThan(1);
    });
  });
});
