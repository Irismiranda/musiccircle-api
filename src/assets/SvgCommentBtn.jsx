import React from "react"

const SvgCommentBtn = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 37 37" 
    fill={props.color}
    {...props}
  >
    <path d="M18.385 0C15.9774 0 13.5934 0.474206 11.3691 1.39554C9.14484 2.31688 7.12379 3.6673 5.42138 5.36971C1.98322 8.80788 0.051675 13.471 0.051675 18.3333C0.0356477 22.5667 1.50146 26.6723 4.19501 29.9383L0.528342 33.605C0.273953 33.8628 0.101626 34.1902 0.033107 34.5458C-0.0354122 34.9015 0.00294597 35.2695 0.143342 35.6033C0.295614 35.9332 0.542466 36.2104 0.852561 36.3997C1.16266 36.589 1.52201 36.682 1.88501 36.6667H18.385C23.2473 36.6667 27.9105 34.7351 31.3486 31.297C34.7868 27.8588 36.7183 23.1956 36.7183 18.3333C36.7183 13.471 34.7868 8.80788 31.3486 5.36971C27.9105 1.93154 23.2473 0 18.385 0ZM18.385 33H6.30334L8.00834 31.295C8.3498 30.9515 8.54146 30.4868 8.54146 30.0025C8.54146 29.5182 8.3498 29.0535 8.00834 28.71C5.60775 26.3121 4.11283 23.156 3.77828 19.7795C3.44372 16.4029 4.29024 13.0148 6.17359 10.1925C8.05695 7.37007 10.8606 5.28799 14.107 4.30095C17.3533 3.31391 20.8414 3.48298 23.9771 4.77934C27.1127 6.07571 29.7019 8.41917 31.3035 11.4105C32.9051 14.4018 33.4199 17.8558 32.7604 21.1842C32.1009 24.5125 30.3077 27.5093 27.6865 29.6638C25.0653 31.8183 21.7781 32.9973 18.385 33Z" />
  </svg>
)

export default SvgCommentBtn