import { useKeyboard } from "@opentui/react";

export function Detail({ toggleDetail }: { toggleDetail: () => void }) {
  useKeyboard((key) => {});
  return (
    <box>
      <box flexDirection="row" alignItems="center" flexGrow={1} padding={1}>
        <box>
          <button onClick={toggleDetail}>
            <text>Detail</text>
          </button>
        </box>
      </box>
    </box>
  );
}
