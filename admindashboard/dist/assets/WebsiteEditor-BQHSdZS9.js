import { e } from "./index-GwRcjPUc.js";
const WebsiteEditor = {
  __name: "WebsiteEditor",
  setup() {
    return () => e("div", { class: "w-full h-full p-0 m-0" }, [
      e("iframe", {
        src: "/admindashboard/website-editor-page.html",
        style: "width: 100%; height: calc(100vh - 160px); min-height: 750px; border: none; border-radius: 12px; background: transparent;",
        id: "website-editor-iframe"
      })
    ]);
  }
};
export { WebsiteEditor as default };
