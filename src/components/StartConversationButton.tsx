"use client";

export function StartConversationButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <div className="mt-3 flex flex-col items-center gap-2 border-t border-[#d8ccb8] pt-3">
      <p className="text-center text-lg font-bold text-[#2c4a22] sm:text-xl">
        Begin gesprek
      </p>
      <button
        type="button"
        onClick={onClick}
        aria-label="Begin gesprek"
        className="flex h-20 w-20 items-center justify-center rounded-full border-[5px] border-[#4a6741] bg-gradient-to-br from-[#4a6741] to-[#3d7a6e] shadow-lg transition hover:scale-105 active:scale-95 sm:h-[5.5rem] sm:w-[5.5rem]"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-white sm:h-14 sm:w-14">
          <span className="h-7 w-7 rounded-full bg-[#4a6741] sm:h-8 sm:w-8" />
        </span>
      </button>
    </div>
  );
}
