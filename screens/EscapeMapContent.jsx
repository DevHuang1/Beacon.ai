import dynamic from "next/dynamic";

const EscapeMapContent = dynamic(() => import("./EscapeMapContentInner"), {
  ssr: false,
});

export default EscapeMapContent;
