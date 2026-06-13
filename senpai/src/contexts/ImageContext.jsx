import { createContext, useContext, useState, useEffect } from 'react';
import { fetchAnimeImages } from '../lib/images.js';

const ImageContext = createContext({});
export const useImages = () => useContext(ImageContext);

export function ImageProvider({ children }) {
  const [images, setImages] = useState({});
  useEffect(() => { fetchAnimeImages().then(setImages); }, []);
  return <ImageContext.Provider value={images}>{children}</ImageContext.Provider>;
}
