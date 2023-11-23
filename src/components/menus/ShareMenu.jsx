import React, { useEffect, useState } from "react"
import { SvgLinkIcon, SvgFeedIcon, SvgIgIcon, SvgTiktokIcon } from "../../assets"
import { Axios } from "../../Axios-config"
import useStore from "../../store"

export default function ShareMenu(){
    const { currentUser } = useStore()
    const [followingList, setFollowingList] = useState(null)


    async function handleIgConnect(){
        try{
           const response = await Axios.post('/instagram_connect', { user_id: currentUser.id })
           window.location.href = response.data
        } catch(err){
            console.log(err)
        }
    }

    function handleTiktokConnect(){

    }

    async function getFollowersList(){
        const response = await Axios.post('/api/profile/following', {currentUser})
        console.log("user is following:", response.data)
        if(response){
            setFollowingList(response.data)
        }
    }

    useEffect(() => {
        console.log("current uer is:", currentUser)
        if(currentUser){
            getFollowersList()
        }
    }, [currentUser])

    return (
        <div>
            { !currentUser?.instagram_connected && 
            <div className="flex" onClick={handleIgConnect}>
                < SvgIgIcon className="svg" />
            </div>}

            { !currentUser?.instagram_connected && 
            <div className="flex" onClick={handleTiktokConnect}>
                <SvgTiktokIcon className="svg" />
            </div>}

            { (!currentUser?.instagram_connected || !currentUser.tiktok_connected) && 
            <h4>Connect to find your friends</h4>}
            <div className="friend_list">
               { followingList && followingList.map(user => {
                    <h1> </h1>     
               })} 
            </div>
            <input placeholder="Find a friend..."/>
            <div className="flex">
                <SvgLinkIcon className="svg" />
            </div>
            <div className="flex">
                <SvgFeedIcon className="svg"/>
            </div>
        </div>
    )
}