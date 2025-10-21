interface AvatarWithFrameProps {
  avatarUrl?: string;
  frameUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const AvatarWithFrame = ({ avatarUrl, frameUrl, size = "lg", className = "" }: AvatarWithFrameProps) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-32 h-32",
    xl: "w-40 h-40",
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Avatar - positioned with padding to account for frame */}
      <div className="absolute inset-[10%] rounded-full overflow-hidden z-10">
        <img
          src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`}
          alt="Avatar"
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Frame overlay */}
      {frameUrl && (
        <div className="absolute inset-0 pointer-events-none z-20">
          <img
            src={frameUrl}
            alt="Frame"
            className="w-full h-full object-contain"
          />
        </div>
      )}
    </div>
  );
};

export default AvatarWithFrame;
