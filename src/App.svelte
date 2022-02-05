<script>
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	export let riotId;
	export let tag;
	let tab = "Home";
	function addPlayer(params) {
		if (riotId != undefined && tag != undefined){
		const req = new XMLHttpRequest();
		req.open("GET", `http://127.0.0.1:3000/createTrackedUser/${riotId}/${tag}`, true);
		req.setRequestHeader("Access-Control-Allow-Origin", "http://127.0.0.1:3000/");
		req.send();
		}
	}
	
	
</script>

<main>
	<aside class="menu">
		<p class="menu-label">
		  General
		</p>
		<ul class="menu-list">
		  <li><a on:click="{tab="Home"}" class="is-primary">Home</a></li>
		  <li><a on:click="{tab="Tracked"}">Tracked</a></li>
		  <li><a on:click="{tab="Token"}" >Token</a></li>
		</ul>
	</aside>
	<div id="main">
		<h1>Welcome to Elchomantus🦌!</h1>
		<input class="input is-primary" type="text" bind:value="{riotId}" placeholder="RiotId">
		<input class="input is-primary" type="text" bind:value="{tag}" placeholder="Tag">
		<button on:click="{addPlayer}" class="button is-primary">Add Player to tracking</button>
		<br>
	</div>
	<div id="tracked">
		
	</div>
	<div id="token">

	</div>
</main>

<style>
	@import "https://cdn.jsdelivr.net/npm/bulma@0.9.3/css/bulma.min.css";
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
		overflow: hidden;
	}

	h1 {
		color: #ff3e00;
		font-size: 4em;
		font-weight: 100;
	}

	input {
		margin-top: 0.2em;
		align-items: center;
		
		width: auto;
	}

	button {
		margin-top: 0.2em;
		align-items: center;
		width: auto;
	}

	.menu {
		position: absolute;
		width: 20%;
		align-items: left;
	}

	#main {
		top: 50%;
  		left: 50%;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>