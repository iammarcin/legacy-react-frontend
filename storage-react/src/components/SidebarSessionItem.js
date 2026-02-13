// SidebarSessionItem.js
import React, { useState, useRef, useEffect } from 'react';

import { formatDate } from '../utils/misc';
import { getSvgIcon } from '../utils/svg.icons.provider';

const SidebarSessionItem = ({
  session,
  availableTags,
  onSelect,
  onContextMenu,
  onTagToggle,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isTagMenuVisible, setIsTagMenuVisible] = useState(false);
  const hoverTimer = useRef(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    hoverTimer.current = setTimeout(() => {
      setIsTagMenuVisible(true);
    }, 500); // 1-second delay
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setIsTagMenuVisible(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
      }
    };
  }, []);

  const TagIcon = ({ tagId, icon, isSet, onClick, isInMenu }) => (
    <span
      className={`tag-icon ${tagId} ${isSet ? 'set' : 'unset'} ${isInMenu ? 'in-menu' : ''}`}
      title={`${isSet ? 'Remove' : 'Add'} ${tagId} tag`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {getSvgIcon(icon)}
    </span>
  );

  // Get unattached tags for the tag menu
  const unattachedTags = availableTags.filter(
    ({ id }) => !session.tags || !session.tags.includes(id)
  );

  return (
    <div
      className={`session-item ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onSelect(session)}
      onContextMenu={(e) => onContextMenu(e, session)}
    >
      <img
        src={`/imgs/${session.ai_character_name}.png`}
        alt={session.ai_character_name}
        className="avatar"
      />
      <div className="session-details">
        <div className="session-name">{session.session_name}</div>
        <div className="session-date">{formatDate(session.last_update)}</div>
        <div className="session-tags">
          {/* Always render attached tags */}
          {session.tags &&
            session.tags.map((tagId) => {
              const tagIcon = availableTags.find(t => t.id === tagId);
              return tagIcon && (
                <TagIcon
                  key={`attached-${tagId}`}
                  tagId={tagId}
                  icon={tagIcon.icon}
                  isSet={true}
                  onClick={() => onTagToggle(session.session_id, tagId)}
                  isInMenu={false}
                />
              );
            })}
          {/* Render tag menu after hover delay */}
          {isTagMenuVisible &&
            unattachedTags.map(({ id, icon }) => (
              <TagIcon
                key={`menu-${id}`}
                tagId={id}
                icon={icon}
                isSet={false}
                onClick={() => onTagToggle(session.session_id, id)}
                isInMenu={true}
              />
            ))}

        </div>
      </div>
    </div>
  );
};

export default SidebarSessionItem;
