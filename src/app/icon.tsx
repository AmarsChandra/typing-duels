import { ImageResponse } from "next/og";

export const size = {
  width: 400,
  height: 400,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#d97706",
        }}
      />
    ),
    size,
  );
}
