import React,{useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {ScreenContainer} from '../../components/ScreenContainer';
import {SafeScrollView} from '../../components/SafeScrollView';
import {MatchCard} from '../../components/MatchCard';
import {AppIcon} from '../../components/AppIcon';
import {Card,EmptyState,LoadingState,SecondaryButton} from '../../components/ui';
import {useTheme} from '../../theme/ThemeProvider';
import {useFavorites} from '../../state/FavoritesContext';
import {useReminders} from '../../state/RemindersContext';
import {useWatchPlan} from '../../state/WatchPlanContext';
import {usePreferences} from '../../state/PreferencesContext';
import {useMatchesRange} from '../../hooks/useMatchesRange';
import {addDays,startOfLocalDay} from '../../utils/dates';
export function FollowingScreen(){
 const {t}=useTranslation(),theme=useTheme(),navigation=useNavigation<any>(),{favoriteTeamIds,favoriteCompetitionIds}=useFavorites(),{getReminderFor,setReminder,cancelReminder}=useReminders(),{items}=useWatchPlan(),{preferences}=usePreferences();const [saved,setSaved]=useState(false);
 const from=useMemo(()=>startOfLocalDay(new Date()).toISOString(),[]),to=useMemo(()=>addDays(new Date(),14).toISOString(),[]),result=useMatchesRange(from,to);
 const matches=result.matches.filter(m=>saved?items.some(i=>i.matchId===m.id):favoriteTeamIds.has(m.homeTeamId)||favoriteTeamIds.has(m.awayTeamId)||favoriteCompetitionIds.has(m.competitionId));
 const more=(screen:string)=>navigation.getParent()?.navigate('MoreTab',{screen});
 return <ScreenContainer><SafeScrollView refreshing={result.refreshing} onRefresh={()=>{void result.refresh(true);}} contentBottomPadding={25}><View style={styles.wrap}><Text style={[styles.kicker,{color:theme.colors.accent}]}>{t('makeover.yourTeams')}</Text><Text style={[styles.title,{color:theme.colors.textPrimary}]}>{t('makeover.following')}</Text><Text style={[styles.subtitle,{color:theme.colors.textSecondary}]}>{t('makeover.followingIntro')}</Text><View style={styles.manage}><SecondaryButton label={t('makeover.manageTeams')} onPress={()=>more('FavoriteTeams')} style={{flex:1}}/><SecondaryButton label={t('makeover.manageLeagues')} onPress={()=>more('FavoriteCompetitions')} style={{flex:1}}/></View><Pressable onPress={()=>more('NotificationSettings')}><Card style={styles.reminder}><AppIcon name="bell" color={theme.colors.accent}/><View style={{flex:1}}><Text style={{color:theme.colors.textPrimary,fontWeight:'700'}}>{t('makeover.favoriteReminders')}</Text><Text style={{color:theme.colors.textMuted,fontSize:12,marginTop:4}}>{preferences.favoriteTeamReminders?t('common.on'):t('common.off')}</Text></View><AppIcon name="chevronRight" color={theme.colors.textMuted}/></Card></Pressable><View style={styles.tabs}>{[false,true].map(value=><Pressable key={String(value)} onPress={()=>setSaved(value)} style={[styles.tab,{backgroundColor:saved===value?theme.colors.accent:theme.colors.surfaceAlt}]}><Text style={{color:saved===value?theme.colors.accentText:theme.colors.textSecondary,fontWeight:'700',fontSize:12}}>{t(value?'makeover.savedMatches':'makeover.fixtures')}</Text></Pressable>)}</View>{result.errorMessage?<Text style={{color:theme.colors.textMuted,fontSize:12,marginBottom:15}}>{result.errorMessage}</Text>:null}{result.loading?<LoadingState label={t('common.loading')}/>:matches.length?matches.map(m=><MatchCard key={m.id} match={m} hasReminder={getReminderFor(m.id)?.status==='scheduled'} onPress={()=>navigation.navigate('MatchDetails',{matchId:m.id,match:m})} onToggleReminder={()=>{if(getReminderFor(m.id))void cancelReminder(m.id);else void setReminder(m,preferences.defaultReminderOffsetMinutes);}}/>):<EmptyState title={t('makeover.noFollowing')} body={t('makeover.noFollowingBody')}/>}<SecondaryButton label={t('makeover.planner')} onPress={()=>more('MatchdayTools')}/></View></SafeScrollView></ScreenContainer>;
}
const styles=StyleSheet.create({wrap:{padding:20},kicker:{fontSize:11,fontWeight:'800',letterSpacing:1.7,marginBottom:10},title:{fontSize:32,fontWeight:'800',letterSpacing:-1},subtitle:{fontSize:13,lineHeight:21,marginTop:8},manage:{flexDirection:'row',gap:10,marginVertical:24},reminder:{flexDirection:'row',gap:14,alignItems:'center'},tabs:{flexDirection:'row',gap:8,marginVertical:22},tab:{paddingVertical:13,paddingHorizontal:18,borderRadius:12}});
