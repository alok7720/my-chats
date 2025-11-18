const SidebarSkeleton = () => {
  const skeletonItems = Array(8).fill(null);

  return (
    <aside className="h-full  border-base-300 flex flex-col animate-fadeIn">
      <div className="overflow-y-auto w-full py-3">
        {skeletonItems.map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3 hover:bg-base-200 transition rounded-lg">
            
            <div className="skeleton w-12 h-12 rounded-full" />

            <div className="hidden lg:flex sm:flex flex-col gap-2 flex-1">
              <div className="skeleton h-4 w-90" />
              <div className="skeleton h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default SidebarSkeleton;