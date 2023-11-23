import React from "react"

const SvgResizeHandle = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 22 22" 
    {...props}
  >
  <g filter="url(#filter0_d_184_90)">
    <path d="M10.4976 17L19 8.49758" stroke="#3D3D3D" strokeWidth="2" strokeLinecap="round"/>
  </g>
  <g filter="url(#filter1_d_184_90)">
    <path d="M3 14.9131L16.913 1.00004" stroke="#3D3D3D" strokeWidth="2" strokeLinecap="round"/>
  </g>
  <defs>
    <filter id="filter0_d_184_90" x="7.49756" y="7.49756" width="14.5024" height="14.5024" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="2"/>
      <feGaussianBlur stdDeviation="1"/>
      <feComposite in2="hardAlpha" operator="out"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.21 0"/>
      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_184_90"/>
      <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_184_90" result="shape"/>
    </filter>
    <filter id="filter1_d_184_90" x="0" y="0" width="19.9131" height="19.9131" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="2"/>
      <feGaussianBlur stdDeviation="1"/>
      <feComposite in2="hardAlpha" operator="out"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.21 0"/>
      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_184_90"/>
      <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_184_90" result="shape"/>
    </filter>
  </defs>
  </svg>
)

export default SvgResizeHandle