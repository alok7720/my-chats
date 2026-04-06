import './css/MessageSkeleton.css';

const MessageSkeleton = () => {
    // Array of objects to define side and custom widths for a natural look
    const skeletonItems = [
        { side: 'left', w: '210px' },
        { side: 'right', w: '150px' },
        { side: 'left', w: '260px' },
        { side: 'right', w: '190px' },
        { side: 'left', w: '140px' },
        { side: 'right', w: '220px' },
    ];

    return (
        <div className="skeleton-wrapper">
            {skeletonItems.map((item, index) => (
                <div key={index} className={`skeleton-container ${item.side}`}>
                    <div 
                        className="skeleton-bubble" 
                        style={{ width: item.w }}
                    ></div>
                    <div className="skeleton-time"></div>
                </div>
            ))}
        </div>
    );
};

export default MessageSkeleton;