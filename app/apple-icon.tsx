import { ImageResponse } from "next/og"

export const size        = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#060D1F",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Green gradient circle */}
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: 36,
            background: "linear-gradient(135deg, #059669, #10B981)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "white",
              fontSize: 100,
              fontWeight: 900,
              lineHeight: 1,
              fontFamily: "system-ui, Arial, sans-serif",
              marginTop: 8,
            }}
          >
            $
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
