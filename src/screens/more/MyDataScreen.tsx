import React,{useEffect,useState} from 'react';
import {Alert,Share,Text,View} from 'react-native';
import {useTranslation} from 'react-i18next';
import RNFS from 'react-native-fs';
import ShareFile from 'react-native-share';
import notifee from '@notifee/react-native';
import {ScreenContainer} from '../../components/ScreenContainer';
import {SafeScrollView} from '../../components/SafeScrollView';
import {Card,PrimaryButton,SecondaryButton,DangerButton} from '../../components/ui';
import {useTheme} from '../../theme/ThemeProvider';
import {usePreferences} from '../../state/PreferencesContext';
import {useSuppressBanner} from '../../ads/useSuppressBanner';
import {installationIdentity,exportMyData,deleteMyData} from '../../services/telemetry';
export function MyDataScreen(){
  const {t}=useTranslation(),theme=useTheme(),{update}=usePreferences();const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');useSuppressBanner();
  useEffect(()=>{installationIdentity().then(i=>setCode(i.recoveryCode)).catch(()=>setError(t('makeover.offline')));},[t]);
  const action=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');try{await fn();}catch{setError(t('makeover.requestFailed'));}finally{setBusy(false);}};
  return <ScreenContainer><SafeScrollView contentBottomPadding={30}><View style={{padding:20,gap:18}}><Text style={{color:theme.colors.textPrimary,fontSize:28,fontWeight:'800'}}>{t('makeover.myData')}</Text><Text style={{color:theme.colors.textSecondary,lineHeight:23}}>{t('makeover.disclosureBody')}</Text><Card><Text style={{color:theme.colors.accent,fontWeight:'700',marginBottom:12}}>{t('makeover.recoveryCode')}</Text><Text selectable style={{color:theme.colors.textPrimary,fontFamily:'monospace',lineHeight:22}}>{code||'—'}</Text><Text style={{color:theme.colors.textMuted,fontSize:12,lineHeight:19,marginTop:12}}>{t('makeover.recoveryHelp')}</Text><SecondaryButton label={t('makeover.saveCode')} disabled={!code||busy} onPress={()=>{void Share.share({message:`Football Scores recovery code: ${code}`});}} style={{marginTop:15}}/></Card>{error?<Text accessibilityRole="alert" style={{color:theme.colors.danger}}>{error}</Text>:null}<PrimaryButton label={busy?t('common.loading'):t('makeover.exportData')} disabled={busy} onPress={()=>action(async()=>{const data=await exportMyData();const file=`${RNFS.CachesDirectoryPath}/football-scores-data.json`;await RNFS.writeFile(file,JSON.stringify(data,null,2),'utf8');try{await ShareFile.open({url:`file://${file}`,type:'application/json',failOnCancel:false});}finally{await RNFS.unlink(file).catch(()=>undefined);}})}/><DangerButton disabled={busy} label={t('makeover.deleteData')} onPress={()=>Alert.alert(t('makeover.deleteData'),t('makeover.deleteConfirm'),[{text:t('common.cancel'),style:'cancel'},{text:t('common.delete'),style:'destructive',onPress:()=>action(async()=>{await deleteMyData();await notifee.cancelTriggerNotifications();await update({dataDisclosureVersion:0});})}])}/><Text style={{color:theme.colors.textMuted,lineHeight:21,fontSize:12}}>{t('makeover.disclosureRights')}</Text></View></SafeScrollView></ScreenContainer>;
}
