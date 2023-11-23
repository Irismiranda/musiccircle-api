import React from "react"

const SvgPlayBtn = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlSpace="preserve"
    viewBox="0 0 300 300"
    fill="#AFADAD" 
    {...props}
  >
   <ellipse 
   rx="106.488854" 
   ry="106.488854" 
   transform="matrix(1.328368 0 0 1.328368 150.000089 149.999991)" 
   fill="none" 
   stroke="#AFADAD" 
   strokeWidth="14"/>
   {props.is_paused === "true" ? 
   <polygon points="0,-80.631501 69.828928,40.31575 -69.828928,40.31575 0,-80.631501" 
   transform="matrix(0 0.964455-.86115 0 150.532113 149.999991)" 
   stroke="#AFADAD" 
   strokeWidth="21" 
   strokeLinejoin="round"/> : 
   <>
   <path d="M103.722134,95.234873v111.464968" 
   transform="matrix(1.210196 0 0 1.210196-11.352048-32.7001)" 
   fill="none" stroke="#AFADAD" strokeWidth="16" 
   strokeLinecap="round"/>
   <path d="M103.722134,95.234873v111.464968" 
   transform="matrix(1.210196 0 0 1.210196 60.304001-32.7001)" 
   fill="none" stroke="#AFADAD" 
   strokeWidth="16" 
   strokeLinecap="round"/>
   </>
   }
   
</svg>
)

export default SvgPlayBtn