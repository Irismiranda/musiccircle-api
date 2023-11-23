import React, { useState, useEffect } from "react"
import { Outlet, useNavigate } from "react-router-dom"
import { Axios } from "../Axios-config"
import { io } from "socket.io-client"
import Cookies from 'js-cookie'
import Spotify from "spotify-web-api-js"
import useStore from "../store"

export default function AuthRequired() {
  const [refreshToken, setRefreshToken] = useState(null)
  const [expiringTime, setExpiringTime] = useState(null)
  const [expired, setExpired] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const newSpotifyApi = new Spotify()
  const navigate = useNavigate()

  const { setAccessToken, accessToken, spotifyApi, setSpotifyApi, setCurrentUser, setSocket, socket } = useStore()

  function setCookies(accessToken, refreshToken, expiringTime){
    const tokenExpiringDate = new Date(Date.now() + expiringTime)
    const refreshTokenExpiringDate = new Date(Date.now() + 86400000)
      const tokenData = {
        token: accessToken,
        expiringTimeStamp: tokenExpiringDate,
      }
      try{
        Cookies.set('storedAccessToken', JSON.stringify(tokenData), { expires: tokenExpiringDate })
        Cookies.set('storedRefreshToken', refreshToken, { expires: refreshTokenExpiringDate})
      } catch(err){
        console.log(err)
      }
  }

  async function getNewToken(refreshToken){
    try {
      const response = await Axios.post("/auth/refresh_token", {
        refresh_token: refreshToken,
      })
      const accessToken = response.data.access_token
      const expiresIn = response.data.expires_in * 1000
      console.log("log - new token expires in:", expiresIn, "ms")
      setExpiringTime(expiresIn - 6000)
      setAccessToken(accessToken)
      setCookies(accessToken, refreshToken, expiresIn)
      console.log("log - token was refreshed successfully")
    } catch(error){
      console.log(error)
    }
  }

  async function getUser() {
    try{       
      const userData = await spotifyApi.getMe()
      const dbUserData = {
        id: userData.id,
        type: "user",
        email: userData.email,
        instagram_connected: false,
        tiktok_connected: false,
      }
      
      const response = await Axios.post("/api/profile", {
        userData: dbUserData,
      })

      const { instagram_connected, tiktok_connected } = response.data.userData

      userData.instagram_connected = instagram_connected
      userData.tiktok_connected = tiktok_connected

      console.log("log - updated user data is:". userData)

      setCurrentUser(userData)

      const stringData = JSON.stringify(userData)
      localStorage.setItem("currentUser", stringData)
      
    } catch(error){
      console.log(error)
    }
  
  }

  function calculateTimeLeft(dateAndTime){
    const currentTime = Math.floor(Date.now())
    const expirationDate = new Date(dateAndTime) 
    const expiresIn = expirationDate.getTime()
    const timeLeft = expiresIn - currentTime
    console.log("log - cookie expires in", timeLeft)
    return timeLeft
  }

  useEffect(() => {
    
    if (!socket && setSocket) {
      const newSocket = io("https://localhost:4000", { withCredentials: true });
      setSocket(newSocket)
      
      return () => {
          newSocket.off('connect')
      }
  }
  }, [socket, setSocket])

  useEffect(() =>{
      if(socket && !socket.connected){
        socket.connect()
      }
      console.log("log - Socket connected:", socket?.connected)
  }, [socket, socket?.connected])

  useEffect(() => {
    setIsLoading(true)
    let storedAccessToken = null
    let storedRefreshToken = null
    try{
      storedAccessToken = Cookies.get('storedAccessToken')
      storedRefreshToken = Cookies.get('storedRefreshToken')
    } catch(err){
      console.log(err)
    }

    if(storedAccessToken && storedRefreshToken){
    const storedAccessTokenData = JSON.parse(storedAccessToken)
    const { token, expiringTimeStamp } = storedAccessTokenData 
    const timeLeft = calculateTimeLeft(expiringTimeStamp)
    setAccessToken(token)
    setExpiringTime(timeLeft)
    setRefreshToken(storedRefreshToken)
    console.log("log - stored token was set")
    } else if(!storedAccessToken && (storedRefreshToken)){
      setRefreshToken(storedRefreshToken)
      getNewToken(storedRefreshToken)
    } else {
      let url = window.location.href
      let params = new URL(url).searchParams
      const access_token = params.get("access_token")
      const expires_in = params.get("expires_in") * 1000
      const refresh_token = params.get("refresh_token")
        if (access_token && refresh_token) {
          setAccessToken(access_token)
          setRefreshToken(refresh_token)
          setExpiringTime(expires_in - 6000)
          setCookies(access_token, refresh_token, expires_in)
          params.delete("access_token")
          let cleanUrl =
          window.location.protocol +
          "//" +
          window.location.host +
          window.location.pathname
          window.history.replaceState({}, document.title, cleanUrl)
        } else {
          navigate("/welcome")
        }
    }
  }, [])

  useEffect(() => {
    if(accessToken){
      newSpotifyApi.setAccessToken(accessToken)
      setSpotifyApi(newSpotifyApi)
    }
  }, [accessToken])

  useEffect(() => {
    let storedUser = null
    try{
      storedUser = localStorage.getItem("currentUser")
    } catch(err){
      console.log(err)
    }

    if(storedUser){
      setCurrentUser(JSON.parse(storedUser))
      console.log("log - got stored user")
    } else {
      if(spotifyApi){
        getUser()
        console.log("log - stored user was set")
      }
    }
    setIsLoading(false)
  }, [spotifyApi])

  useEffect(() => {
    if (expiringTime){
      const timeInMs = expiringTime
      console.log("log - setting timer to:", timeInMs, "ms")
      setTimeout(() => {
        setExpired(true)
      }, timeInMs)
    }
  }, [expiringTime])

  useEffect(() => {
    if(expired && refreshToken){
      console.log("log - token has expired")
      getNewToken(refreshToken)
    }
  }, [expired])

  if (accessToken && !isLoading) {
    return <Outlet/>
  } else {
    return (
    <div className="wrapper default_padding" style={{ width: "95vw", margin: "10px auto" }}>
        <h2>Loading...</h2>
    </div>
    )
  }
}
