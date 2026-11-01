import type { NewsArticle } from '../types/domain';
import {serverRequest,type ApiEnvelope} from '../services/serverApi';
import {readCache,writeCache} from '../storage/repositories/providerCacheRepo';
export interface NewsResult { articles: NewsArticle[]; isFromCache: boolean; isStale: boolean; failedSources: string[] }
export interface FetchNewsOptions { forceRefresh?: boolean; language?: 'en' | 'ar' }
export async function fetchFootballNews(options:FetchNewsOptions={}):Promise<NewsResult>{
 const key=`server:news:${options.language||'en'}`,cached=await readCache<ApiEnvelope<NewsArticle[]>>(key);
 if(cached&&!cached.isStale&&!options.forceRefresh)return {articles:cached.payload.data,isFromCache:true,isStale:!!cached.payload.meta.isStale,failedSources:[]};
 try{const data=await serverRequest<ApiEnvelope<NewsArticle[]>>(`/news?language=${options.language||'en'}`);await writeCache(key,'server',data,300000);return {articles:data.data,isFromCache:false,isStale:!!data.meta.isStale,failedSources:[]};}
 catch{return {articles:cached?.payload.data||[],isFromCache:true,isStale:true,failedSources:['Football Scores']};}
}
export function articleMentions(article: NewsArticle, name: string): boolean { return article.title.toLowerCase().includes(name.toLowerCase()); }
