import React,{useEffect,useState} from 'react';
import {Image,View} from 'react-native';
import {AppIcon} from './AppIcon';
import {useTheme} from '../theme/ThemeProvider';
import {SERVER_ORIGIN} from '../config/serverConfig';
/** Only use the backend's licensed raster cache; never fetch arbitrary provider artwork. */
export function TeamCrest({uri,name,size=44,onReady}:{uri?:string|null;name:string;initials?:string|null;size?:number;onReady?:()=>void}){
 const theme=useTheme();const [failed,setFailed]=useState(false);
 const source=uri?.startsWith('/api/v1/crests/')?`${SERVER_ORIGIN}${uri}`:uri?.startsWith(`${SERVER_ORIGIN}/api/v1/crests/`)?uri:null;
 useEffect(()=>{setFailed(false);if(!source)onReady?.();},[source]);
 return <View accessibilityLabel={name} style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}>{source&&!failed?<Image source={{uri:source}} resizeMode="contain" style={{width:size,height:size}} onLoadEnd={onReady} onError={()=>{setFailed(true);onReady?.();}}/>:<View style={{width:size,height:size,borderRadius:size*.25,backgroundColor:theme.colors.accentSoft,alignItems:'center',justifyContent:'center'}}><AppIcon name="shield" size={size*.65} color={theme.colors.accent}/></View>}</View>;
}
