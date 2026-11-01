import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SafeScrollView } from '../../components/SafeScrollView';
import { PrimaryButton, SecondaryButton } from '../../components/ui';
import { AppIcon } from '../../components/AppIcon';
import { useTheme } from '../../theme/ThemeProvider';
import { usePreferences } from '../../state/PreferencesContext';
import { useSuppressBanner } from '../../ads/useSuppressBanner';
import { beginNewInstallation } from '../../services/telemetry';
import { SERVER_ORIGIN } from '../../config/serverConfig';
export function DataDisclosureScreen(){
  const {t}=useTranslation(),theme=useTheme(),{update}=usePreferences();useSuppressBanner();
  return <ScreenContainer><SafeScrollView contentBottomPadding={30}><View style={styles.wrap}>
    <View style={[styles.icon,{backgroundColor:theme.colors.accentSoft}]}><AppIcon name="ball" size={42} color={theme.colors.accent}/></View>
    <Text style={[styles.eyebrow,{color:theme.colors.accent}]}>{t('makeover.beforeKickoff')}</Text>
    <Text style={[styles.title,{color:theme.colors.textPrimary}]}>{t('makeover.disclosureTitle')}</Text>
    <Text style={[styles.body,{color:theme.colors.textSecondary}]}>{t('makeover.homeIntro')}</Text>
    <Text style={[styles.fineprint,{color:theme.colors.textSecondary}]}>{t('makeover.disclosureBody')}</Text>
    <PrimaryButton label={t('makeover.acceptSharing')} onPress={async()=>{await beginNewInstallation();await update({dataDisclosureVersion:1});}}/>
    <SecondaryButton label={t('about.privacyPolicy')} onPress={()=>{void Linking.openURL(`${SERVER_ORIGIN}/privacy`);}} style={{marginTop:12}}/>
  </View></SafeScrollView></ScreenContainer>;
}
const styles=StyleSheet.create({wrap:{padding:28,paddingTop:80},icon:{width:88,height:88,borderRadius:28,alignItems:'center',justifyContent:'center',marginBottom:36},eyebrow:{fontSize:11,fontWeight:'800',letterSpacing:2,marginBottom:14},title:{fontSize:38,fontWeight:'800',letterSpacing:-1,marginBottom:18},body:{fontSize:16,lineHeight:26},fineprint:{fontSize:13,lineHeight:20,marginTop:64,marginBottom:24}});
