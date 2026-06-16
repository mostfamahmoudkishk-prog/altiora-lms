import {
  createBunnyVideoFn,
  uploadVideoFn,
  deleteBunnyVideoFn,
  getVideoStatusFn,
  getBunnySignedUrlFn,
} from "./db.functions";

export const createVideoFn = createBunnyVideoFn;
export { uploadVideoFn };
export const deleteVideoFn = deleteBunnyVideoFn;
export { getVideoStatusFn };
export const generateSignedVideoUrlFn = getBunnySignedUrlFn;
