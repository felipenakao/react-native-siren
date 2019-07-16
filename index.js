import React from 'react'
import { Alert, Linking } from 'react-native'
import DeviceInfo from 'react-native-device-info'
import apisauce from 'apisauce'

const createAPI = (baseURL = 'https://itunes.apple.com/br/') => {
  const api = apisauce.create({
    baseURL,
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 10000
  })

  return {
    getLatest: (bundleId) => api.get('lookup', {bundleId})
  }
}

const performCheck = () => {
  let updateIsAvailable = false
  const api = createAPI()
  const bundleId = DeviceInfo.getBundleId()

  // Call API
  return api.getLatest(bundleId).then(response => {
    let latestInfo = null
    // Did we get our exact result?
    if (response.ok && response.data.resultCount === 1) {
      latestInfo = response.data.results[0]
      // check for version difference
      updateIsAvailable = latestInfo.version !== DeviceInfo.getVersion()
    }

    return {updateIsAvailable, ...latestInfo}
  })
}

const attemptUpgrade = (appId) => {
  // failover if itunes - a bit excessive
  const itunesURI = `itms-apps://itunes.apple.com/app/id${appId}?mt=8`
  const itunesURL = `https://itunes.apple.com/app/id${appId}?mt=8`

  Linking.canOpenURL(itunesURI).then(supported => {
    if (supported) {
      Linking.openURL(itunesURI)
    } else {
      Linking.openURL(itunesURL)
    }
  })
}

const showUpgradePrompt = (appId) => {
  Alert.alert(
    'Atualização Disponível',
    'Existe uma versão atualizada do aplicativo na App Store. Por favor, atualize.',
    [
      {text: 'Atualizar', onPress: () => attemptUpgrade(appId)},
    ]
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

