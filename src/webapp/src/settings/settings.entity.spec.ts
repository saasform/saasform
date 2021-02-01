import { SettingsEntity } from './settings.entity'

describe('SettingsEntity', () => {
  it('should be defined', () => {
    expect(new SettingsEntity()).toBeDefined()
  })

  it('setValuesFromJson works with empty values', () => {
    const settings = new SettingsEntity() as any
    settings.setValuesFromJson()
    expect(settings).toBeDefined()
  })

  it('JSON should deserialize', () => {
    const testTitle = 'Test title'
    const testGA = 'Test GA'

    const data = {
      title: testTitle,
      google_analytics: testGA,
      description: 'new value'
    }

    const settings = new SettingsEntity() as any
    settings.category = 'website'
    settings.description = 'existing'
    settings.json = data

    expect(settings.title).toBeUndefined()
    expect(settings.google_analytics).toBeUndefined()

    settings.setValuesFromJson()

    expect(settings.title).toEqual(testTitle)
    expect(settings.google_analytics).toEqual(testGA)
    expect(settings.description).toEqual('existing')
  })

  it.skip('JSON should reserialize', () => {
    const testTitle = 'Test title'
    const testGA = 'Test GA'
    const data = {
      title: testTitle,
      google_analytics: testGA
    }

    const settings = new SettingsEntity() as any
    settings.title = testTitle
    settings.google_analytics = testGA
    settings.description = ''
    settings.category = 'website'

    settings.setJsonFromValues()

    expect(settings.json).toEqual(data)
  })
})
