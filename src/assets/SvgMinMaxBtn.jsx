import React from "react"

const SvgMinMaxBtn = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24" 
    height="10px"
    {...props}
  >
  {props.is_minimized === "true"? 
  <path 
  d="M19 3H5C3.89 3 3 3.89 3 5V19C3 19.5304 3.21071 20.0391 3.58579 20.4142C3.96086 20.7893 4.46957 21 5 21H19C19.5304 21 20.0391 20.7893 20.4142 20.4142C20.7893 20.0391 21 19.5304 21 19V5C21 4.46957 20.7893 3.96086 20.4142 3.58579C20.0391 3.21071 19.5304 3 19 3ZM19 5V19H5V5H19Z" 
  fill="#707070"
  stroke="#707070" 
  strokeWidth="0.7" 
  /> :
  <path 
  d="M1.5 10.5H16.5" 
  stroke="#707070" 
  strokeWidth="3" 
  strokeLinecap="round"/>
 }  </svg>
)

export default SvgMinMaxBtn