interface TabsProps {
  tabNum: number;
  setTabNum: (num: number) => void;
}

export function Tabs({ tabNum, setTabNum }: TabsProps) {
  return (
    <div>
      <div onClick={() => setTabNum(0)}>Chat {tabNum === 0 && "(active)"}</div>
      <div onClick={() => setTabNum(1)}>
        Players {tabNum === 1 && "(active)"}
      </div>
    </div>
  );
}
