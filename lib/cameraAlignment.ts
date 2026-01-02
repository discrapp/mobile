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
 *
 * Key insight: The camera preview shows a portion of the full sensor image.
 * When a portrait preview shows a landscape photo, the preview is essentially
 * showing the vertical center of the photo. The cropper then shows the photo
 * in a square container, which will crop differently.
 *
 * We need to calculate where the center of the camera preview maps to in the
 * cropper's coordinate system.
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

  const photoAspect = photoWidth / photoHeight;
  const previewAspect = previewWidth / previewHeight;
  const cropperAspect = 1; // Square

  // Calculate how the photo displays in the cropper (square container, cover mode)
  const cropperDisplay = calculateCoverDisplay(
    photoWidth,
    photoHeight,
    containerSize,
    containerSize
  );

  // For landscape photos (photoAspect > 1) in portrait preview (previewAspect < 1):
  // The camera shows the photo filling the width and cropping top/bottom
  // The circle is centered in the preview, so it's at the vertical center of what's visible

  // For landscape photos in square cropper (cover mode):
  // The photo fills the width, and height overflows (top/bottom cropped equally)

  // The key question: where does the camera's circle center map to in the photo?
  // If the camera fills width and crops height, the circle center Y in preview
  // corresponds to a specific Y in the photo based on how much is cropped.

  // Simplified approach for the common case (landscape photo, portrait preview):
  // The camera likely shows the photo scaled to fill the preview width,
  // with the photo vertically centered (cropping top and bottom equally).

  let translateX = 0;
  let translateY = 0;
  let scale = 1;

  if (photoAspect > 1 && previewAspect < 1) {
    // Landscape photo in portrait preview (most common case)
    // Camera preview fills width, crops height (centered)
    // The visible portion of the photo in the preview is centered vertically

    // In the square cropper with cover mode for landscape photo:
    // Photo fills width, height overflows equally on top/bottom
    // The cropper's center shows the photo's center

    // Since both camera and cropper center the photo vertically,
    // no vertical translation should be needed for a centered circle.
    // But the circle might not be exactly centered in the preview...

    // Circle position relative to preview center
    const circleDeltaY = cameraCircleCenterY - previewHeight / 2;

    // This delta needs to be scaled based on how the preview displays the photo
    // vs how the cropper displays it

    // Camera preview: photo scaled to fill width
    const cameraPhotoScale = previewWidth / photoWidth;
    const cameraDisplayedHeight = photoHeight * cameraPhotoScale;

    // Cropper: photo scaled to fill width (since it's landscape in square)
    // Already calculated: cropperDisplay.displayHeight

    // The ratio of display heights tells us how to scale the delta
    const heightRatio = cropperDisplay.displayHeight / cameraDisplayedHeight;

    translateY = -circleDeltaY * heightRatio;
  } else if (photoAspect < 1 && previewAspect < 1) {
    // Portrait photo in portrait preview
    // Both are portrait, so horizontal alignment is the issue

    const circleDeltaX = cameraCircleCenterX - previewWidth / 2;

    // Similar calculation for horizontal offset
    const cameraPhotoScale = previewHeight / photoHeight;
    const cameraDisplayedWidth = photoWidth * cameraPhotoScale;

    const widthRatio = cropperDisplay.displayWidth / cameraDisplayedWidth;

    translateX = -circleDeltaX * widthRatio;
  }
  // For other cases (square photo, etc.), default to no translation

  // Scale adjustment if circle sizes differ
  // This ensures the same physical disc size appears in both circles
  if (cameraCircleSize !== cropperCircleSize) {
    scale = cropperCircleSize / cameraCircleSize;
    scale = Math.max(1, Math.min(scale, 3));

    // Adjust translation for scale
    if (scale !== 1) {
      translateX = translateX / scale;
      translateY = translateY / scale;
    }
  }

  return {
    scale,
    translateX,
    translateY,
  };
}
