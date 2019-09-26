import React from 'react'
import { Alert, Linking, Platform } from 'react-native'
import DeviceInfo from 'react-native-device-info'
import apisauce from 'apisauce'
import semver from 'semver'

const createAPI = () => {
  const baseURL = Platform.OS === 'ios' ?
    'https://itunes.apple.com/br/' :
    'https://s3.us-east-2.amazonaws.com/';
  const api = Platform.OS === 'ios' ?
    apisauce.create({
      baseURL,
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    }) :
    apisauce.create({ baseURL });

  return {
    getLatest: Platform.OS === 'ios' ? (bundleId) => api.get('lookup', {bundleId}) :
      () => api.get('dev.rxpro.com.br/versionChecker.json')
  }
}

const performCheck = () => {
  let updateIsAvailable = false
  const api = createAPI()
  const bundleId = DeviceInfo.getBundleId()

  // Call API
  return api.getLatest(bundleId).then(response => {
    let latestInfo = null
    if (Platform.OS === 'ios') {
      // Did we get our exact result?
      if (response.ok && response.data.resultCount === 1) {
        latestInfo = response.data.results[0]
        // check for version difference
        updateIsAvailable = semver.gt(latestInfo.version, DeviceInfo.getVersion());
      }
  
      return {updateIsAvailable, ...latestInfo}
    }

    // Did we get our exact result?
    if (response.ok && response.data['com.rxpro.br']) {
      latestInfo = response.data['com.rxpro.br'].minVersionName;
      // check for version difference
      updateIsAvailable = semver.gt(latestInfo || latestInfo.version, DeviceInfo.getVersion());
    }

    return { updateIsAvailable, ...latestInfo, trackId: 'com.rxpro.br' }
  })
}

const attemptUpgrade = (appId) => {
  // failover if itunes - a bit excessive
  const itunesURI = `itms-apps://itunes.apple.com/app/id${appId}?mt=8`
  const itunesURL = `https://itunes.apple.com/app/id${appId}?mt=8`
  const marketURL = `market://details?id=${appId}`; 

  Platform.OS === 'ios' ? 
    Linking.canOpenURL(itunesURI).then(supported => {
      if (supported) {
        Linking.openURL(itunesURI)
      } else {
        Linking.openURL(itunesURL)
      }
    }) :
    Linking.openURL(marketURL);
}

const showUpgradePrompt = (appId) => {
  Alert.alert(
    'Atualização Disponível',
    'Existe uma versão atualizada desse aplicativo disponível. Por favor, atualize.',
    [
      {text: 'Atualizar', onPress: () => attemptUpgrade(appId)},
    ],
    { cancelable: false },
  )
}

const promptUser = () => {
  performCheck().then(sirenResult => {
    if (sirenResult.updateIsAvailable) showUpgradePrompt(sirenResult.trackId)
  })
}

export default {
  promptUser
}
