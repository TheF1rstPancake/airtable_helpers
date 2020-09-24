
/** Is is an ok place to import from */
import GlobalConfig from "@airtable/blocks/dist/types/src/global_config"

export interface GlobalManagerClass {
	readonly init: boolean
	readonly status: boolean
	validate(): void
	becomeManager(): Promise<void>
	tryToBecomeManager(): Promise<void>
	setManagerIsBusy(): Promise<() => void>
	releaseManager(): Promise<void>
	resetStatus(): Promise<void>
}

interface GlobalManagerProps {
	globalConfig: GlobalConfig
	triggerUpdate(status: boolean): void
}

export class GlobalManager implements GlobalManagerClass {
	private globalConfig: GlobalConfig = null
	private globalId = Math.floor(Math.random() * 1000000)
	private globalKey = 'managerId'
	private isManager: boolean = false
	private released: boolean = false
	private loading: boolean = false
	private triggerUpdate: (status: boolean) => void = null
	init: boolean

	constructor(props: GlobalManagerProps) {
		this.globalConfig = props.globalConfig
		this.triggerUpdate = props.triggerUpdate
		window.addEventListener('beforeunload', () =>
			this.releaseManager()
		)
		this.init = false
		this.initialize()
	}

	/** Attmeps to become the manager */
	private async initialize() {
		await this.tryToBecomeManager()
		this.init = true
	}

	/** Checks to see if another user is the manager */
	private checkStatus(): Promise<void> {
		return new Promise(async (resolve, reject) => {
			if(this.globalConfig.get(this.globalKey) === this.globalId) return
			this.loading = true
			if(this.globalConfig.get('active') !== 'false')
				await this.globalConfig.setAsync('active', 'false')
			/** Allow the manager to reset the status if they are active */
			setTimeout(async () => {
				const value = this.globalConfig.get('active') as string
				console.log('VALUE', value)
				if(value === 'false' || !value) await this.becomeManager()
				this.loading = false
				return resolve()
			}, 2000)
		})
	}

	/** Ensures this block is the manager */
	validate() {
		if(this.globalId !== this.globalConfig.get(this.globalKey)) {
			console.log('Changed')
			this.isManager = false
			this.triggerUpdate?.(this.isManager)
		}
	}

	/** Sets the manaerId key in Global Confif to this class's id
	 * @TODO check if current global manager has heigher privlages
	 * 	and if so, request to take control instead of just taking it
	 */
	async becomeManager(): Promise<void> {
		if(this.released) return
		if(this.globalConfig.hasPermissionToSet(this.globalKey)) {
			this.isManager = true
			await this.globalConfig.setPathsAsync([{
				path: [this.globalKey], value: this.globalId
			}, {
				path: ['active'], value: 'true'
			}])
			this.triggerUpdate?.(this.isManager)
		}
	}

	/** Becomes the manager if no one else is */
	async tryToBecomeManager(): Promise<void> {
		return new Promise((resolve, reject) => {
			if(this.loading || this.released) return resolve()
			setTimeout(async () => {
				console.log(this.globalConfig.get('busy'))
				if(this.globalConfig.get('busy')) return resolve()
				await this.checkStatus()
				return resolve()
			}, 1000)
		})
	}

	async setManagerIsBusy(): Promise<() => void> {
		if(!this.isManager) return
		await this.globalConfig.setAsync('busy', true)
		return () => this.globalConfig.setAsync('busy', false)
	}

	/** Sets the managerId in the Global Data to null
	 * 	Other users can now attempt to become the manager
	 */
	async releaseManager(): Promise<void> {
		if(!this.isManager) return
		this.released = true
		this.isManager = false
		this.globalConfig.setAsync(this.globalKey, null)
		this.triggerUpdate(this.isManager)
	}

	/** Resets the active status to true
	 * 	Allows the other blocks to know that there is a user acting as the manager
	 */
	async resetStatus(): Promise<void> {
		if(this.loading) return
		const value = this.globalConfig.get('active') as string
		console.log('Reset STatus', value, this.isManager)
		if(this.isManager && value === 'false' || !value)
			await this.globalConfig.setAsync('active', 'true')
	}

	get status() { return this.isManager }
}