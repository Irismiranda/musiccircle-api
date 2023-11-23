import React, { useState, createRef, useEffect } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { SvgMusicCircle, SvgHomeIcon, SvgSearchIcon, SvgCommentBtn, SvgNotificationsIcon } from '../../../src/assets'
import { Notifications, Account, Search } from '../'
import { useClickOutside } from "../../utils/utils"
import useStore from "../../store"

export default function SideMenu(){
    const sideMenuRef = createRef(null)
    const extendedMenu = createRef(null)
    const location = useLocation()
    const { currentUser, setSideMenuWidth, sideMenuWidth, setStandardWrapperWidth } = useStore()
    const [ activeMenu, setActiveMenu ] = useState(null)

    useClickOutside(extendedMenu, sideMenuRef, () => switchActiveMenu(null))

    const determineActiveMenu = () => {
        const path = location.pathname
        if (path.includes('/inbox')){
            setActiveMenu('messages')
        } else if(path.includes('/my_profile')){
            setActiveMenu('profile')
        } else {
            setActiveMenu(null)
        }
    }

    function switchActiveMenu(componentName){
        if(activeMenu === null || activeMenu !== componentName){
            setActiveMenu(componentName)
        } else {
            setActiveMenu(null)
        }
    }

    useEffect(() => {
        determineActiveMenu()
    }, [location])

    useEffect(() => {
        if (sideMenuRef.current) {
            const sideMenuCurrentWidth = sideMenuRef.current.getBoundingClientRect().right + sideMenuRef.current.getBoundingClientRect().left
            setSideMenuWidth(sideMenuCurrentWidth)
            if(!activeMenu){
                setStandardWrapperWidth(sideMenuCurrentWidth)
            }
        }
    }, [activeMenu, setActiveMenu])

    return (
        <>
            <div className='side_menu_wrapper flex' ref={sideMenuRef}>
                <div className='side_menu' style={{ cursor: "pointer", marginRight: !activeMenu ? "30px" : ""}}>
                    <Link to="/" className='flex gap'>
                        <SvgMusicCircle className="svg_big"/>
                        {!activeMenu && <h2>Music<span style={{ color: "#F230AA", fontWeight: "500" }}>Circle</span></h2>}
                    </Link>
                    <Link to="/" className='flex gap'>
                        <SvgHomeIcon className="svg_big" color={ activeMenu === null ? "#F230AA" : "white" }/>
                        {!activeMenu && <h2>Home</h2>}
                    </Link>
                    <div className='flex gap' onClick={() => switchActiveMenu("search")}>
                        <SvgSearchIcon className="svg_big" color={ activeMenu === "search" ? "#F230AA" : "white" }/>
                        {!activeMenu && <h2>Search</h2>}
                    </div>
                    <Link to="/inbox" className='flex gap'>
                        <SvgCommentBtn className="svg_big"  color={ activeMenu === "messages" ? "#F230AA" : "white" }/>
                        {!activeMenu && <h2>Messages</h2>}
                    </Link>
                    <div className='flex gap' onClick={() => switchActiveMenu("notifications")}>
                        <SvgNotificationsIcon className="svg_big" color={ activeMenu === "notifications" ? "#F230AA" : "white" }/>
                        {!activeMenu && <h2>Notifications</h2>}
                    </div>
                    <div className='flex gap' onClick={() => switchActiveMenu("account")}>
                        { currentUser.images && <img src={`${currentUser.images[0].url}`} className='profile_small'/> }
                        {!activeMenu && <h2>My Profile</h2>}
                    </div>
                </div>
                {(activeMenu && activeMenu !== ("messages" || "profile") ) && <div ref={extendedMenu} className='side_menu_expanded side_menu_wrapper gap' style={{ left: `${sideMenuWidth}px` }}>
                    {activeMenu === "search" && <Search />}
                    {activeMenu === "notifications" && <Notifications />}
                    {activeMenu === "account" && <Account />}
                </div>}
            </div>
            <Outlet />
        </>
    )
}
