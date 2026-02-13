import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import './css/Wanderer.css';

import { marked } from 'marked';
import DOMPurify from 'dompurify';

import { useSettings } from '../hooks/useSettings';
import { triggerFormDataAPIRequest } from '../services/api.methods';
import { getCustomerId } from '../utils/configuration';

// Add Link import from react-router-dom
import { Link } from 'react-router-dom';

// Import Leaflet components and CSS
// import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'; // Moved to WandererMap.js
// import 'leaflet/dist/leaflet.css'; // Moved to WandererMap.js
// import L from 'leaflet'; // Moved to WandererMap.js
import HikeDetailMap from './WandererMap'; // Import the map component

// Fix for default Leaflet icon issue with webpack
// delete L.Icon.Default.prototype._getIconUrl; // Moved to WandererMap.js
// L.Icon.Default.mergeOptions({ // Moved to WandererMap.js
//   iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'), // Moved to WandererMap.js
//   iconUrl: require('leaflet/dist/images/marker-icon.png'), // Moved to WandererMap.js
//   shadowUrl: require('leaflet/dist/images/marker-shadow.png'), // Moved to WandererMap.js
// }); // Moved to WandererMap.js

const Wanderer = () => {
  const [gpxFile, setGpxFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [audioFiles, setAudioFiles] = useState([]);
  const [note, setNote] = useState('');

  const [markdownContent, setMarkdownContent] = useState('');
  const [sanitizedHtmlContent, setSanitizedHtmlContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [trackPoints, setTrackPoints] = useState([]);
  const [photoDataList, setPhotoDataList] = useState([]);

  const getSettings = useSettings();
  const fileInputRef = useRef(null);

  const handleNoteChange = (event) => {
    setNote(event.target.value);
  };

  const processFiles = (droppedFiles) => {
    let currentGpx = gpxFile;
    const currentImages = [...imageFiles];
    const currentAudios = [...audioFiles];

    Array.from(droppedFiles).forEach(file => {
      if (file.name.toLowerCase().endsWith('.gpx')) {
        currentGpx = file; // Replace if a new GPX is dropped/selected
      } else if (file.type.startsWith('image/')) {
        // Avoid adding duplicates
        if (!currentImages.find(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified)) {
          currentImages.push(file);
        }
      } else if (file.type.startsWith('audio/')) {
        // Avoid adding duplicates
        if (!currentAudios.find(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified)) {
          currentAudios.push(file);
        }
      }
    });

    setGpxFile(currentGpx);
    setImageFiles(currentImages);
    setAudioFiles(currentAudios);
  };

  const handleFileDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('drag-over');
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      processFiles(event.dataTransfer.files);
      event.dataTransfer.clearData();
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('drag-over');
  };

  const handleFileInputChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      processFiles(event.target.files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const clearAllFiles = () => {
    setGpxFile(null);
    setImageFiles([]);
    setAudioFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input value
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!gpxFile && imageFiles.length === 0 && audioFiles.length === 0) {
      console.warn("No files selected for blog generation.");
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setMarkdownContent('');
    setTrackPoints([]); // Clear previous track points
    setPhotoDataList([]); // Clear previous photo data

    const formData = new FormData();
    if (gpxFile) {
      formData.append('gpxFile', gpxFile);
    }
    imageFiles.forEach((file) => {
      formData.append('imageFiles', file); // Use same key for all image files
    });
    audioFiles.forEach((file) => {
      formData.append('audioFiles', file); // Use same key for all audio files
    });
    formData.append('note', note);

    formData.append('action', 'generate_blog_from_files');
    formData.append('category', 'wanderer_blog_generator'); // Ensure this matches backend generator mapping

    const defaultSettings = getSettings();

    formData.append('user_settings', JSON.stringify(defaultSettings));
    formData.append('customer_id', String(getCustomerId() ?? 1));

    try {
      console.log("Submitting data to backend with FormData...");
      const response = await triggerFormDataAPIRequest('agent', formData);
      console.log("Response from backend:", response);
      if (response && response.success) {
        const payload = response.data || {};
        const generatedMarkdown = payload.blog || response.message || '';

        setMarkdownContent(generatedMarkdown);
        setIsSubmitted(true);

        // track points
        if (payload.track_points) {
          setTrackPoints(payload.track_points);
          console.log("Track points set:", payload.track_points);
        } else {
          setTrackPoints([]);
        }

        // photo data list
        if (payload.photo_data_list) {
          setPhotoDataList(payload.photo_data_list);
          console.log("Photo data list set:", payload.photo_data_list);
        } else {
          setPhotoDataList([]);
        }
      } else {
        console.error('Failed to generate blog or unexpected response structure:', response);
        setIsError(true);
        const responseMessage = response?.message || 'Failed to generate blog.';
        setMarkdownContent(`# Error generating blog: ${responseMessage}\nPlease check the console and try again.`);
        setTrackPoints([]);
        setPhotoDataList([]);
      }
    } catch (error) {
      console.error('Error submitting hike data: ', error);
      setIsError(true);
      const errorMessage = error?.response?.data?.message || error?.message || 'An unknown error occurred.';
      setMarkdownContent(`# Error generating blog: ${errorMessage}\nPlease try again.`);
      setTrackPoints([]);
      setPhotoDataList([]);
    } finally {
      setIsLoading(false);
    }
  }, [gpxFile, imageFiles, audioFiles, note, getSettings]);

  const commonBoxHeight = typeof window !== 'undefined' ? window.innerHeight * 0.75 : 600;
  const totalWidth = typeof window !== 'undefined' ? window.innerWidth * 0.98 : 1100;

  const initialInputPaneWidth = isSubmitted ? totalWidth * 0.25 : totalWidth * 0.6;
  // const initialPreviewPaneWidth = isSubmitted ? totalWidth * 0.75 : totalWidth * 0.4; // No longer directly used for initial state of preview

  const [dynamicInputWidth, setDynamicInputWidth] = useState(initialInputPaneWidth);

  useEffect(() => {
    // Recalculate initial width when isSubmitted or totalWidth changes
    const newInitialInputWidth = isSubmitted ? totalWidth * 0.25 : totalWidth * 0.6;
    setDynamicInputWidth(newInitialInputWidth);
  }, [isSubmitted, totalWidth]);

  useEffect(() => {
    if (markdownContent) {
      const rawHtml = marked(markdownContent);
      const sanitizedHtml = DOMPurify.sanitize(rawHtml);
      setSanitizedHtmlContent(sanitizedHtml);
    } else {
      setSanitizedHtmlContent('');
    }
  }, [markdownContent]);

  const dynamicPreviewWidth = totalWidth - dynamicInputWidth;

  const inputMinMaxWidth = [Math.max(250, totalWidth * 0.2), totalWidth * 0.8];
  const previewMinMaxWidth = [Math.max(300, totalWidth * 0.2), totalWidth * 0.8];

  // Constraints for the input pane, considering the preview pane's limits
  const constrainedMinInputWidth = Math.max(inputMinMaxWidth[0], totalWidth - previewMinMaxWidth[1]);
  const constrainedMaxInputWidth = Math.min(inputMinMaxWidth[1], totalWidth - previewMinMaxWidth[0]);

  return (
    <div className="hiking-blog-generator">
      <h2>Automatic Hiking Blog Generation</h2>
      <div style={{ marginBottom: '15px', textAlign: 'center' }}>
        <Link to="/wanderer/example" className="example-link">
          View Example Blog Post &rarr;
        </Link>
      </div>

      {isError && <p className="error-message">An error occurred while generating the blog. Please check the console and try again.</p>}

      <div className="resizable-panels-container">
        <ResizableBox
          width={dynamicInputWidth}
          height={commonBoxHeight}
          axis="x"
          minConstraints={[constrainedMinInputWidth, commonBoxHeight]}
          maxConstraints={[constrainedMaxInputWidth, commonBoxHeight]}
          className="box"
          resizeHandles={['e']}
          onResize={(event, { size }) => {
            setDynamicInputWidth(size.width);
          }}
        >
          <div className="input-pane">
            <h3>Upload Your Hike Data</h3>

            <div
              className="file-drop-zone"
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={triggerFileInput}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') triggerFileInput(); }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                multiple
                accept=".gpx,image/*,audio/*"
                style={{ display: 'none' }}
                disabled={isLoading}
              />
              <p>Drag & drop GPX, image, and audio files here, or click to select.</p>
            </div>

            {(gpxFile || imageFiles.length > 0 || audioFiles.length > 0) && (
              <div className="selected-files-display">
                <h4>Selected Files:</h4>
                {gpxFile && (
                  <div className="form-group">
                    <label>GPX File:</label>
                    <p>{gpxFile.name}</p>
                  </div>
                )}
                {imageFiles.length > 0 && (
                  <div className="form-group">
                    <label>Images:</label>
                    <ul>
                      {imageFiles.map((file, index) => (
                        <li key={index}>{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {audioFiles.length > 0 && (
                  <div className="form-group">
                    <label>Audio Files:</label>
                    <ul>
                      {audioFiles.map((file, index) => (
                        <li key={index}>{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button onClick={clearAllFiles} className="clear-files-button" disabled={isLoading}>
                  Clear All Files
                </button>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="note">Optional Note:</label>
              <textarea
                id="note"
                value={note}
                onChange={handleNoteChange}
                rows="5"
                disabled={isLoading}
              />
            </div>
            <button
              className="submit-button"
              onClick={handleSubmit}
              disabled={isLoading || (!gpxFile && imageFiles.length === 0 && audioFiles.length === 0)}
            >
              {isLoading ? 'Generating...' : 'Generate Blog'}
            </button>
          </div>
        </ResizableBox>

        <ResizableBox
          width={dynamicPreviewWidth}
          height={commonBoxHeight}
          axis="x"
          minConstraints={[previewMinMaxWidth[0], commonBoxHeight]} // These are now more for reference as width is derived
          maxConstraints={[previewMinMaxWidth[1], commonBoxHeight]} // These are now more for reference as width is derived
          className="box"
          resizeHandles={[]} // No handles for the preview pane, its width is controlled by the input pane
        >
          <div className="preview-pane">
            <h3>Generated Blog Preview</h3>
            {isLoading && (
              <div className="loading-overlay">
                <div className="spinner"></div>
                <p>Processing your hike data, please wait...</p>
              </div>
            )}
            {!isLoading && sanitizedHtmlContent && (
              <div dangerouslySetInnerHTML={{ __html: sanitizedHtmlContent }} />
            )}
            {!isLoading && !sanitizedHtmlContent && (
              <p>{isSubmitted ? 'Blog content will appear here.' : 'Submit your hike data to see the preview.'}</p>
            )}
          </div>
        </ResizableBox>
      </div>
      {isSubmitted && trackPoints && trackPoints.length > 0 && (
        <HikeDetailMap trackPoints={trackPoints} photoDataList={photoDataList} />
      )}
    </div>
  );
};

// const HikeDetailMap = ({ trackPoints, photoDataList }) => { // Component moved to WandererMap.js
//   if (!trackPoints || trackPoints.length === 0) {
//     return null;
//   }
//
//   const polylineCoordinates = trackPoints.map(p => [p.latitude, p.longitude]);
//   const mapCenter = polylineCoordinates.length > 0 ? polylineCoordinates[0] : [0, 0]; // Default center if needed
//
//   console.log("HikeDetailMap received photoDataList:", photoDataList);
//   console.log("HikeDetailMap received trackPoints:", trackPoints);
//
//   const photoMarkers = photoDataList.map(photo => {
//     if (!photo.time || !trackPoints || trackPoints.length === 0) {
//       console.log("Skipping photo due to missing time or no track points:", photo);
//       return null;
//     }
//     try {
//       const photoTime = new Date(photo.time).getTime();
//       if (isNaN(photoTime)) {
//         console.log("Skipping photo due to invalid photo time:", photo);
//         return null;
//       }
//
//       let closestTrackPoint = null;
//       let minTimeDiff = Infinity;
//
//       trackPoints.forEach(tp => {
//         if (!tp.time || typeof tp.latitude !== 'number' || typeof tp.longitude !== 'number') {
//           return; // Skip trackpoint if essential data is missing
//         }
//         try {
//           const trackPointTime = new Date(tp.time).getTime();
//           if (isNaN(trackPointTime)) return;
//
//           const timeDiff = Math.abs(photoTime - trackPointTime);
//           if (timeDiff < minTimeDiff) {
//             minTimeDiff = timeDiff;
//             closestTrackPoint = tp;
//           }
//         } catch (e) {
//           console.error("Error parsing track point time:", tp.time, e);
//         }
//       });
//
//       if (closestTrackPoint) {
//         // Optional: Add a threshold for max allowed time difference (e.g., 60000ms = 1 minute)
//         // if (minTimeDiff > 60000) {
//         //   console.log("Photo", photo.path, "too far in time from closest track point:", minTimeDiff, "ms");
//         //   return null;
//         // }
//         console.log("Matched photo", photo.path, "to trackPoint at", closestTrackPoint.time, "with diff (ms):", minTimeDiff);
//         return {
//           ...photo,
//           latitude: closestTrackPoint.latitude,
//           longitude: closestTrackPoint.longitude,
//         };
//       } else {
//         console.log("No suitable trackPoint found for photo:", photo.path);
//       }
//     } catch (e) {
//       console.error("Error processing photo for time matching:", photo, e);
//     }
//     return null;
//   }).filter(marker => marker !== null); // Filter out nulls (photos that couldn't be matched
//
//   console.log("Generated photoMarkers for map:", photoMarkers);
//
//   return (
//     <div className="hike-map-container">
//       <h3>Hike Map</h3>
//       <MapContainer center={mapCenter} zoom={13} style={{ height: "450px", width: "100%" }} className="leaflet-container">
//         <TileLayer
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//           attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//         />
//         <Polyline positions={polylineCoordinates} color="blue" />
//         {photoMarkers.map((markerData, index) => (
//           // We now use markerData which has coordinates from the matched track point
//           <Marker key={`photo-marker-${index}`} position={[markerData.latitude, markerData.longitude]}>
//             <Popup>
//               {markerData.path && <img src={markerData.path} alt={markerData.caption || `Photo ${index + 1}`} style={{ width: '150px', height: 'auto' }} />}
//               {markerData.time && <p>Photo Time: {new Date(markerData.time).toLocaleString()}</p>}
//               {/* Optionally, show the original photo coords if they exist, for comparison */}
//               {/* {typeof photo.latitude === 'number' && <p>Original Coords: {photo.latitude.toFixed(5)}, {photo.longitude.toFixed(5)}</p>} */}
//             </Popup>
//           </Marker>
//         ))}
//       </MapContainer>
//     </div>
//   );
// };

export default Wanderer;
