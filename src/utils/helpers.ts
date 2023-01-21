export const isIFrame = (
  input: HTMLElement | null
): input is HTMLIFrameElement => input !== null && input.tagName === "IFRAME";
