/**
 * Camera to Cropper Alignment Utilities
 *
 * These utilities calculate the initial transforms needed for the image cropper
 * to display the same region that was visible within the camera circle overlay.
 *
 * The problem being solved:
 * - Camera preview has a certain aspect ratio (usually portrait on phones)
 * - Captured photo may have a different aspect ratio (sensor ratio, often 4:3)
 * - Camera shows a circle overlay centered in the preview
 * - Cropper shows the photo in a square container with resizeMode="cover"
 * - We need to calculate initial scale/translate to align the cropper circle
 *   with the same content that was in the camera circle
 */

export interface CameraCaptureMeta {
  /** Width of the captured photo in pixels */
  photoWidth: number;
  /** Height of the captured photo in pixels */
  photoHeight: number;
  /** Width of the camera preview view in points */
  previewWidth: number;
  /** Height of the camera preview view in points */
  previewHeight: number;
  /** Size of the circle overlay in the camera view */
  circleSize: number;
  /** X coordinate of circle center in preview coordinates */
  circleCenterX: number;
  /** Y coordinate of circle center in preview coordinates */
  circleCenterY: number;
}

export interface CropperConfig {
  /** Size of the square container in the cropper */
  containerSize: number;
  /** Size of the circle overlay in the cropper */
  circleSize: number;
}

export interface InitialTransforms {
  /** Initial scale for the cropper (1 = no zoom) */
  scale: number;
  /** Initial X translation */
  translateX: number;
  /** Initial Y translation */
  translateY: number;
}

/**
 * Calculate how an image displays with resizeMode="cover" in a given container
 */
function calculateCoverDisplay(
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  containerHeight: number
): { displayWidth: number; displayHeight: number; offsetX: number; offsetY: number } {
  const imageAspect = imageWidth / imageHeight;
  const containerAspect = containerWidth / containerHeight;

  let displayWidth: number;
  let displayHeight: number;

  if (imageAspect > containerAspect) {
    // Image is wider relative to container - fit height, overflow width
    displayHeight = containerHeight;
    displayWidth = containerHeight * imageAspect;
  } else {
    // Image is taller relative to container - fit width, overflow height
    displayWidth = containerWidth;
    displayHeight = containerWidth / imageAspect;
  }

  // Offsets center the overflow
  const offsetX = (containerWidth - displayWidth) / 2;
  const offsetY = (containerHeight - displayHeight) / 2;

  return { displayWidth, displayHeight, offsetX, offsetY };
}

/**
 * Calculate the initial transforms for the cropper to align with camera capture
 *
 * This ensures that what the user saw inside the camera circle will appear
 * inside the cropper circle without requiring manual adjustment.
 */
export function calculateInitialCropperTransforms(
  captureMeta: CameraCaptureMeta,
  cropperConfig: CropperConfig
): InitialTransforms {
  const {
    photoWidth,
    photoHeight,
    previewWidth,
    previewHeight,
    circleSize: cameraCircleSize,
    circleCenterX: cameraCircleCenterX,
    circleCenterY: cameraCircleCenterY,
  } = captureMeta;

  const { containerSize, circleSize: cropperCircleSize } = cropperConfig;

  // Step 1: Calculate how the photo was displayed in the camera preview
  // (Camera uses resizeMode="cover" to fill the preview area)
  const cameraDisplay = calculateCoverDisplay(
    photoWidth,
    photoHeight,
    previewWidth,
    previewHeight
  );

  // Step 2: Find the circle center position in the displayed image coordinates
  // The camera circle center is at (cameraCircleCenterX, cameraCircleCenterY) in preview coords
  // We need to find where this maps to in the photo

  // Position relative to displayed image (accounting for cover mode offset)
  const circleInDisplayX = cameraCircleCenterX - cameraDisplay.offsetX;
  const circleInDisplayY = cameraCircleCenterY - cameraDisplay.offsetY;

  // Convert to normalized position (0-1 range) in the displayed image
  const normalizedX = circleInDisplayX / cameraDisplay.displayWidth;
  const normalizedY = circleInDisplayY / cameraDisplay.displayHeight;

  // Step 3: Calculate how the photo displays in the cropper
  // Cropper uses a square container with resizeMode="cover"
  const cropperDisplay = calculateCoverDisplay(
    photoWidth,
    photoHeight,
    containerSize,
    containerSize
  );

  // Step 4: Find where the same normalized position appears in the cropper
  const targetInCropperDisplayX = normalizedX * cropperDisplay.displayWidth;
  const targetInCropperDisplayY = normalizedY * cropperDisplay.displayHeight;

  // Position in cropper container coordinates
  const targetInContainerX = targetInCropperDisplayX + cropperDisplay.offsetX;
  const targetInContainerY = targetInCropperDisplayY + cropperDisplay.offsetY;

  // Step 5: Calculate the translation needed to center this point
  // Cropper circle is always centered at (containerSize/2, containerSize/2)
  const cropperCircleCenterX = containerSize / 2;
  const cropperCircleCenterY = containerSize / 2;

  // Base translation to align centers
  let translateX = cropperCircleCenterX - targetInContainerX;
  let translateY = cropperCircleCenterY - targetInContainerY;

  // Step 6: Calculate scale adjustment if circle sizes differ
  // We need to scale so the same amount of content fits in the cropper circle
  const cameraCircleRadiusInPhoto =
    (cameraCircleSize / 2) * (photoWidth / cameraDisplay.displayWidth);
  const cropperCircleRadiusInPhoto =
    (cropperCircleSize / 2) * (photoWidth / cropperDisplay.displayWidth);

  let scale = cropperCircleRadiusInPhoto / cameraCircleRadiusInPhoto;

  // Clamp scale to cropper limits (1x to 3x)
  scale = Math.max(1, Math.min(scale, 3));

  // Adjust translation for scale (transforms apply as: scale first, then translate)
  // If we're scaling around center, the translation needs adjustment
  if (scale !== 1) {
    // The translation calculated above is for scale=1
    // For a different scale, we need to adjust
    translateX = translateX / scale;
    translateY = translateY / scale;
  }

  return {
    scale,
    translateX,
    translateY,
  };
}
