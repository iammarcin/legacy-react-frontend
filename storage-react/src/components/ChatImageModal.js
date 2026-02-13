import React, { useEffect, useRef, useCallback } from 'react';
import './css/ChatImageModal.css';
import { getSvgIcon } from '../utils/svg.icons.provider';

// this will be used to display images (attached to chat or image of AI character) or charts (from Health section)
// if its image - just display
// if its AI character - display with description and name
// isChart - important - because different way to handle images and charts by default false
// isImage - show image (big)
// isCharacter - when displaying character - similar to image but smaller max size
const ChatImageModal = ({ images, currentIndex, onClose, onNext, onPrev, characterName = null, characterDescription = null, isImage = false, isChart = false, isCharacter = false }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isChart && !isImage) return;
    // Resize canvas elements in the modal
    const resizeCanvas = () => {
      const canvasElements = document.querySelectorAll('.image-modal-content canvas');
      canvasElements.forEach(canvas => {
        canvas.style.width = '100%';
        canvas.style.height = '80vh';
      });
    };

    resizeCanvas();
  }, [currentIndex, isChart, isImage]);

  // resize upon displaying the chart
  useEffect(() => {
    if (isChart || isImage) {
      window.dispatchEvent(new Event('resize'));
    }
  }, [isChart, isImage, currentIndex]);


  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowRight') onNext();
    if (e.key === 'ArrowLeft') onPrev();
  }, [onClose, onNext, onPrev]);

  // click outside / hit keyboard listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, handleKeyDown]);

  const handleDownload = async () => {
    const imgSrc = images[currentIndex];
    if (!imgSrc || typeof imgSrc !== 'string') return;

    try {
      const response = await fetch(imgSrc, { cache: 'no-store' });
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = imgSrc.split('/').pop() || 'image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // CORS blocked - open in new tab so user can save from there
      window.open(imgSrc, '_blank');
    }
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="image-modal">
      <div className={`image-modal-content ${isChart ? 'modal-chart-container' : ''}`} ref={modalRef}>
        <span className="close" onClick={onClose}>&times;</span>
        {isImage && !isChart && (
          <button className="modal-download-btn" onClick={handleDownload} title="Download image">
            {getSvgIcon('download')}
          </button>
        )}
        {isChart ? (
          <div className="modal-chart">
            {images[currentIndex]}
          </div>
        ) : (
          <img src={images[currentIndex]} alt="Chat" className={`${isCharacter ? 'modal-character-image' : 'modal-image'}`} />
        )}
        {characterName && <div className="modal-character-name">{characterName}</div>}
        {characterDescription && <div className="modal-character-description">{characterDescription}</div>}
        {images.length > 1 && (
          <>
            <button className="prev" onClick={onPrev}>&#10094;</button>
            <button className="next" onClick={onNext}>&#10095;</button>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatImageModal;
