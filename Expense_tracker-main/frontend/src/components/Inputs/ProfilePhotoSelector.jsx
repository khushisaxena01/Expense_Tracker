import React, { useRef, useState } from 'react';
import { LuUser, LuUpload, LuTrash } from 'react-icons/lu';

const ProfilePhotoSelector = ({ image, setImage, small }) => {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImage(file);
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setPreviewUrl(null);
  };

  const onChooseFile = () => {
    inputRef.current.click();
  };

  return (
    <div className={`flex justify-center ${small ? "w-14 h-7" : "w-20 h-7"} relative`}>
      <input type="file" accept="image/*" ref={inputRef} onChange={handleImageChange} className="hidden" />
      
      {!image ? (
        <div className={`flex items-center justify-center bg-white rounded-full relative ${small ? "w-14 h-14" : "w-20 h-20"}`}>
          <LuUser className={`text-${small ? "3xl" : "4xl"} text-primary`} />
          
          <button
            type="button"
            className="w-6 h-6 flex items-center justify-center bg-black text-white rounded-full absolute -bottom-1 -right-1
                       hover:bg-blue-700 ease-in-out transition-transform duration-150 active:scale-90"
            onClick={onChooseFile}
          >
            <LuUpload />
          </button>
        </div>
      ) : (
        <div className="relative">
          <img src={previewUrl} alt="Profile Photo" className={`rounded-full object-cover ${small ? "w-14 h-14" : "w-20 h-20"}`} />
          <button
            type="button"
            className="w-6 h-6 flex items-center justify-center bg-black text-white rounded-full absolute -bottom-1 -right-1
                        hover:bg-red-600 ease-in-out transition-transform duration-150 active:scale-90"
            onClick={handleRemoveImage}
          >
            <LuTrash />
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfilePhotoSelector;
