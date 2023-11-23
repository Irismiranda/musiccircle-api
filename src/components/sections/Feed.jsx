import React from "react"
import useStore from "../../store"

export default function Feed(){
    const { standardWrapperWidth } = useStore()

    return (
        <div className="wrapper default_padding" style={{ width: standardWrapperWidth }}>
            <h1> Feed Goes Here </h1>
        </div>
    )
}